package pe.edu.unt.tecleollave;

import android.app.ActivityOptions;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.util.Collections;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class AppLockerService extends Service {

    private static final String TAG = "AppLockerService";
    private static final String CHANNEL_ID = "tecleollave_protection_channel";
    private static final int NOTIFICATION_ID = 2026;

    private static final Set<String> protectedPackages = Collections.synchronizedSet(new HashSet<>());
    private static final Map<String, Long> sessionUnlockedPackages = new ConcurrentHashMap<>();
    private static volatile boolean isEnrolled = false;
    private static volatile String activePhrase = "seguridad unt 2026";
    private static volatile String lastHandledPackage = "";
    private static volatile long lastHandledTime = 0;
    private static volatile String activeProtectedForegroundPackage = "";

    public static volatile AppLockerService serviceInstance = null;
    private ScheduledExecutorService executorService;
    private BroadcastReceiver screenReceiver;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate() {
        super.onCreate();
        serviceInstance = this;
        loadConfigFromPrefs();
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, buildForegroundNotification());
        registerScreenReceiver();
        startMonitoringLoop();
        Log.i(TAG, "Servicio AppLocker en segundo plano iniciado correctamente.");
    }

    private void registerScreenReceiver() {
        try {
            screenReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (intent == null || intent.getAction() == null) return;
                    String action = intent.getAction();
                    if (Intent.ACTION_SCREEN_OFF.equals(action)) {
                        Log.i(TAG, "Pantalla apagada (ACTION_SCREEN_OFF). Bloqueando todas las aplicaciones protegidas.");
                        clearUnlockedSession();
                    } else if (Intent.ACTION_USER_PRESENT.equals(action) || Intent.ACTION_SCREEN_ON.equals(action)) {
                        lastHandledPackage = "";
                        lastHandledTime = 0;
                        if (executorService != null && !executorService.isShutdown()) {
                            executorService.execute(() -> checkForegroundApp());
                        }
                    }
                }
            };
            IntentFilter filter = new IntentFilter();
            filter.addAction(Intent.ACTION_SCREEN_OFF);
            filter.addAction(Intent.ACTION_SCREEN_ON);
            filter.addAction(Intent.ACTION_USER_PRESENT);
            registerReceiver(screenReceiver, filter);
        } catch (Exception e) {
            Log.w(TAG, "Error registrando receptor de pantalla: " + e.getMessage());
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        serviceInstance = this;
        loadConfigFromPrefs();
        startMonitoringLoop();
        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);
        try {
            // Asegurar que la supervisión se reactive si el usuario desliza la app en recientes
            Intent restartService = new Intent(getApplicationContext(), AppLockerService.class);
            restartService.setPackage(getPackageName());
            PendingIntent restartPending = PendingIntent.getService(
                this, 1, restartService, PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
            );
            AlarmManager alarmService = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (alarmService != null) {
                alarmService.set(AlarmManager.ELAPSED_REALTIME, SystemClock.elapsedRealtime() + 1000, restartPending);
            }
        } catch (Exception ignored) {}
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        serviceInstance = null;
        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdown();
        }
        if (screenReceiver != null) {
            try {
                unregisterReceiver(screenReceiver);
            } catch (Exception ignored) {}
        }
        Log.i(TAG, "Servicio AppLocker detenido.");
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "TECLEOLLAVE - Protección en Segundo Plano",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Supervisión de seguridad y biometría conductual de aplicaciones protegidas");
                nm.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildForegroundNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        int count = protectedPackages.size();
        String contentText = count > 0 
            ? "Protegiendo " + count + " aplicaciones con tu ritmo de tecleo" 
            : "Protección biométrica activa en segundo plano";

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("TECLEOLLAVE Protección Activa")
            .setContentText(contentText)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
    }

    private void startMonitoringLoop() {
        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdown();
        }
        executorService = Executors.newSingleThreadScheduledExecutor();
        // Supervisión a 250 ms: ágil, inmediata y sin consumo excesivo de CPU
        executorService.scheduleWithFixedDelay(this::checkForegroundApp, 0, 250, TimeUnit.MILLISECONDS);
    }

    private void checkForegroundApp() {
        // Si no hay aplicaciones configuradas para proteger, no hay nada que evaluar
        if (protectedPackages.isEmpty()) {
            return;
        }

        // Si MainActivity ya está en primer plano mostrando el reto o la interfaz, no relanzar
        if (MainActivity.isAppInForeground) {
            return;
        }

        try {
            UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
            if (usm == null) return;

            long now = System.currentTimeMillis();
            long begin = now - 3500;
            UsageEvents events = usm.queryEvents(begin, now);

            String topPackage = null;
            boolean topPackageIsActive = false;
            boolean foundEvents = false;

            if (events != null) {
                UsageEvents.Event event = new UsageEvents.Event();
                while (events.hasNextEvent()) {
                    events.getNextEvent(event);
                    int eventType = event.getEventType();
                    String pkg = event.getPackageName();

                    if (pkg == null || pkg.isEmpty()
                        || pkg.equals(getPackageName())
                        || pkg.contains("inputmethod")) {
                        continue;
                    }

                    foundEvents = true;

                    if (eventType == UsageEvents.Event.ACTIVITY_RESUMED || eventType == 1) {
                        topPackage = pkg;
                        topPackageIsActive = true;
                    } else if (eventType == UsageEvents.Event.ACTIVITY_PAUSED || eventType == 2
                            || eventType == 23 /* ACTIVITY_STOPPED */) {
                        if (pkg.equals(topPackage)) {
                            topPackageIsActive = false;
                        }
                    }
                }
            }

            // Fallback con queryUsageStats para dispositivos con event buffer diferido (solo si no se recibieron eventos)
            if (!foundEvents && (topPackage == null || topPackage.isEmpty())) {
                try {
                    java.util.List<android.app.usage.UsageStats> statsList = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, begin, now);
                    if (statsList != null && !statsList.isEmpty()) {
                        long maxTime = 0;
                        for (android.app.usage.UsageStats u : statsList) {
                            long lastUsed = u.getLastTimeUsed();
                            // Solo considerar aplicaciones activadas en los últimos 1500ms
                            if (now - lastUsed <= 1500 && lastUsed > maxTime) {
                                String p = u.getPackageName();
                                if (p != null && !p.equals(getPackageName()) && !p.contains("inputmethod")) {
                                    maxTime = lastUsed;
                                    topPackage = p;
                                }
                            }
                        }
                        if (topPackage != null && !topPackage.isEmpty()) {
                            topPackageIsActive = true;
                        }
                    }
                } catch (Exception ignored) {}
            }

            if (topPackage == null || topPackage.isEmpty()) {
                return;
            }

            // REGLA 1: Si la aplicación protegida no está activa (se pausó/minimizó al ver ventanas recientes o Home)
            // o si el usuario pasó al Launcher o a otra aplicación no protegida
            if (!topPackageIsActive || !protectedPackages.contains(topPackage)) {
                if (activeProtectedForegroundPackage != null && !activeProtectedForegroundPackage.isEmpty()) {
                    Log.i(TAG, "La aplicación protegida " + activeProtectedForegroundPackage + " se cerró o minimizó (estado actual: " + topPackage + ", activo=" + topPackageIsActive + "). Bloqueando de nuevo...");
                    sessionUnlockedPackages.remove(activeProtectedForegroundPackage);
                    activeProtectedForegroundPackage = "";
                }
                lastHandledPackage = "";
                lastHandledTime = 0;
                return;
            }

            // REGLA 2: Si la aplicación en primer plano está protegida y se encuentra ACTIVA (en pantalla completa)
            if (topPackageIsActive && protectedPackages.contains(topPackage)) {
                boolean isUnlocked = sessionUnlockedPackages.containsKey(topPackage);

                if (!isUnlocked) {
                    // Evitar spam constante si ya lanzamos el reto en los últimos 1500ms para este mismo paquete
                    if (topPackage.equals(lastHandledPackage) && (now - lastHandledTime < 1500)) {
                        return;
                    }

                    lastHandledPackage = topPackage;
                    lastHandledTime = now;

                    Log.i(TAG, "Detectada aplicación protegida activa en primer plano: " + topPackage + ". Mostrando reto TECLEOLLAVE...");
                    launchBiometricChallenge(topPackage);
                } else {
                    // La app está desbloqueada y en uso activo por el usuario
                    activeProtectedForegroundPackage = topPackage;
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Error en bucle de supervisión: " + e.getMessage());
        }
    }

    private void launchBiometricChallenge(final String targetPackage) {
        MainActivity.pendingChallengePackage = targetPackage;
        AndroidSecurityBridgePlugin.notifyChallengeReceived(targetPackage);

        mainHandler.post(() -> {
            try {
                Intent intent = new Intent(this, MainActivity.class);
                intent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK |
                    Intent.FLAG_ACTIVITY_SINGLE_TOP |
                    Intent.FLAG_ACTIVITY_CLEAR_TOP |
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                );
                intent.putExtra("ACTION", "CHALLENGE");
                intent.putExtra("TARGET_PACKAGE", targetPackage);

                PendingIntent pendingIntent = PendingIntent.getActivity(
                    this,
                    (int) System.currentTimeMillis(),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                Bundle optionsBundle = null;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    ActivityOptions opts = ActivityOptions.makeBasic();
                    opts.setPendingIntentBackgroundActivityStartMode(ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED);
                    optionsBundle = opts.toBundle();
                }

                // Disparo prioritario FullScreenIntent para sobreponer la pantalla en Android 10-15
                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    Notification lockNotif = new NotificationCompat.Builder(this, CHANNEL_ID)
                        .setContentTitle("🔒 RETO BIOMÉTRICO TECLEOLLAVE")
                        .setContentText("Desbloqueo requerido para: " + targetPackage)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentIntent(pendingIntent)
                        .setFullScreenIntent(pendingIntent, true)
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setCategory(NotificationCompat.CATEGORY_ALARM)
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                        .setAutoCancel(true)
                        .build();
                    nm.notify(NOTIFICATION_ID + 1, lockNotif);
                }

                try {
                    pendingIntent.send(this, 0, intent, null, null, null, optionsBundle);
                } catch (Exception e) {
                    startActivity(intent);
                }
            } catch (Exception e) {
                try {
                    Intent fallbackIntent = new Intent(this, MainActivity.class);
                    fallbackIntent.addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK |
                        Intent.FLAG_ACTIVITY_SINGLE_TOP |
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                    );
                    fallbackIntent.putExtra("ACTION", "CHALLENGE");
                    fallbackIntent.putExtra("TARGET_PACKAGE", targetPackage);
                    startActivity(fallbackIntent);
                } catch (Exception ex) {
                    Log.e(TAG, "Error al lanzar pantalla de reto biométrico: " + ex.getMessage());
                }
            }
        });
    }

    private void loadConfigFromPrefs() {
        SharedPreferences prefs = getSharedPreferences("tecleollave_applocker_prefs", MODE_PRIVATE);
        isEnrolled = prefs.getBoolean("is_enrolled", false);
        activePhrase = prefs.getString("phrase", "seguridad unt 2026");
        Set<String> savedPackages = prefs.getStringSet("protected_packages", null);
        protectedPackages.clear();
        if (savedPackages != null) {
            protectedPackages.addAll(savedPackages);
        }
    }

    // =========================================================================
    // MÉTODOS ESTÁTICOS PARA CONTROL DESDE EL PLUGIN CAPACITOR
    // =========================================================================

    public static void updateConfiguration(Context context, Set<String> packages, boolean enrolled, String phrase) {
        isEnrolled = enrolled;
        activePhrase = phrase != null ? phrase : "seguridad unt 2026";
        protectedPackages.clear();
        if (packages != null) {
            protectedPackages.addAll(packages);
        }

        SharedPreferences prefs = context.getSharedPreferences("tecleollave_applocker_prefs", MODE_PRIVATE);
        prefs.edit()
            .putBoolean("is_enrolled", enrolled)
            .putString("phrase", activePhrase)
            .putStringSet("protected_packages", new HashSet<>(protectedPackages))
            .apply();

        // Actualizar notificación del servicio
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent notificationIntent = new Intent(context, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, notificationIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            );
            int count = protectedPackages.size();
            String text = count > 0 
                ? "Protegiendo " + count + " aplicaciones con tu ritmo de tecleo" 
                : "Protección biométrica activa en segundo plano";

            Notification n = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setContentTitle("TECLEOLLAVE Protección Activa")
                .setContentText(text)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
            nm.notify(NOTIFICATION_ID, n);
        }
    }

    public static void unlockPackageForSession(String packageName) {
        if (packageName != null && !packageName.isEmpty()) {
            long now = System.currentTimeMillis();
            sessionUnlockedPackages.put(packageName, now);
            activeProtectedForegroundPackage = packageName;
            lastHandledPackage = "";
            lastHandledTime = 0;
            Log.i(TAG, "Paquete desbloqueado satisfactoriamente para la sesión: " + packageName);
        }
    }

    public static void clearUnlockedSession() {
        sessionUnlockedPackages.clear();
        activeProtectedForegroundPackage = "";
        lastHandledPackage = "";
        lastHandledTime = 0;
        Log.i(TAG, "Sesiones de desbloqueo restablecidas. Todas las aplicaciones protegidas quedan bloqueadas.");
    }
}

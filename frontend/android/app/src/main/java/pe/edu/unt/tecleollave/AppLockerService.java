package pe.edu.unt.tecleollave;

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
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
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

    private ScheduledExecutorService executorService;
    private BroadcastReceiver screenOffReceiver;

    @Override
    public void onCreate() {
        super.onCreate();
        loadConfigFromPrefs();
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, buildForegroundNotification());
        registerScreenOffReceiver();
        startMonitoringLoop();
        Log.i(TAG, "Servicio AppLocker en segundo plano iniciado correctamente.");
    }

    private void registerScreenOffReceiver() {
        try {
            screenOffReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (intent != null && Intent.ACTION_SCREEN_OFF.equals(intent.getAction())) {
                        Log.i(TAG, "Pantalla apagada / bloqueada (ACTION_SCREEN_OFF). Bloqueando todas las aplicaciones protegidas inmediatamente...");
                        clearUnlockedSession();
                    }
                }
            };
            IntentFilter filter = new IntentFilter(Intent.ACTION_SCREEN_OFF);
            registerReceiver(screenOffReceiver, filter);
        } catch (Exception e) {
            Log.w(TAG, "Error registrando receptor de pantalla apagada: " + e.getMessage());
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            loadConfigFromPrefs();
        }
        return START_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdown();
        }
        if (screenOffReceiver != null) {
            try {
                unregisterReceiver(screenOffReceiver);
            } catch (Exception ignored) {}
        }
        Log.i(TAG, "Servicio AppLocker detenido.");
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "TECLEOLLAVE - Protección en Segundo Plano",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Supervisión de seguridad y biometría conductual de aplicaciones protegidas");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
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
        String contentText = isEnrolled
            ? (count > 0 ? "Protegiendo " + count + " aplicaciones con tu ritmo de tecleo" : "Protección biométrica activa")
            : "Calibración requerida para activar bloqueo";

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
        executorService.scheduleWithFixedDelay(this::checkForegroundApp, 500, 600, TimeUnit.MILLISECONDS);
    }

    private void checkForegroundApp() {
        // REGLA 1: La frase llave solo funcionará si el usuario entrenó su perfil
        if (!isEnrolled || protectedPackages.isEmpty()) {
            return;
        }

        try {
            UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
            if (usm == null) return;

            long now = System.currentTimeMillis();
            long begin = now - 2500;
            UsageEvents events = usm.queryEvents(begin, now);
            if (events == null) return;

            String topPackage = null;
            UsageEvents.Event event = new UsageEvents.Event();
            while (events.hasNextEvent()) {
                events.getNextEvent(event);
                if (event.getEventType() == UsageEvents.Event.ACTIVITY_RESUMED) {
                    topPackage = event.getPackageName();
                }
            }

            if (topPackage == null || topPackage.isEmpty()) {
                return;
            }

            // Excluir nuestra propia aplicación (cuando muestra el reto de desbloqueo o interfaz)
            if (topPackage.equals(getPackageName())) {
                return;
            }

            // Excluir teclados del sistema o interfaz del sistema
            if (topPackage.contains("inputmethod") || topPackage.contains("systemui")) {
                return;
            }

            // REGLA 2: Si el usuario salió de la app protegida (Home, Launcher o cualquier otra app)
            // Se revoca inmediatamente el desbloqueo para exigir la frase llave al volver a abrirla
            if (!protectedPackages.contains(topPackage)) {
                if (activeProtectedForegroundPackage != null && !activeProtectedForegroundPackage.isEmpty()) {
                    Log.i(TAG, "La aplicación protegida " + activeProtectedForegroundPackage + " se cerró o minimizó. Bloqueando de nuevo...");
                    sessionUnlockedPackages.remove(activeProtectedForegroundPackage);
                    activeProtectedForegroundPackage = "";
                }
                if (!topPackage.equals(lastHandledPackage)) {
                    lastHandledPackage = "";
                }
                return;
            }

            // REGLA 3: Si la aplicación en primer plano está protegida con la frase llave
            if (protectedPackages.contains(topPackage)) {
                boolean isUnlocked = sessionUnlockedPackages.containsKey(topPackage);

                if (!isUnlocked) {
                    // Evitar spam constante si ya lanzamos el reto en los últimos 2 segundos para este paquete
                    if (topPackage.equals(lastHandledPackage) && (now - lastHandledTime < 2000)) {
                        return;
                    }

                    lastHandledPackage = topPackage;
                    lastHandledTime = now;

                    Log.i(TAG, "Detectada aplicación protegida en primer plano: " + topPackage + ". Mostrando reto TECLEOLLAVE...");
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

    private void launchBiometricChallenge(String targetPackage) {
        new Handler(Looper.getMainLooper()).post(() -> {
            try {
                Intent intent = new Intent(this, MainActivity.class);
                intent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK |
                    Intent.FLAG_ACTIVITY_SINGLE_TOP |
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                );
                intent.putExtra("ACTION", "CHALLENGE");
                intent.putExtra("TARGET_PACKAGE", targetPackage);
                startActivity(intent);
            } catch (Exception e) {
                Log.e(TAG, "Error al lanzar pantalla de reto biométrico: " + e.getMessage());
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

        // Actualizar notificación si el servicio está activo
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent notificationIntent = new Intent(context, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, notificationIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            );
            int count = protectedPackages.size();
            String text = isEnrolled
                ? (count > 0 ? "Protegiendo " + count + " aplicaciones con tu ritmo de tecleo" : "Protección biométrica activa")
                : "Calibración requerida para activar bloqueo";

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
            sessionUnlockedPackages.put(packageName, System.currentTimeMillis());
            activeProtectedForegroundPackage = packageName;
            lastHandledPackage = "";
            Log.i(TAG, "Paquete desbloqueado satisfactoriamente para la sesión: " + packageName);
        }
    }

    public static void clearUnlockedSession() {
        sessionUnlockedPackages.clear();
        activeProtectedForegroundPackage = "";
        lastHandledPackage = "";
        Log.i(TAG, "Sesiones de desbloqueo restablecidas. Todas las aplicaciones protegidas quedan bloqueadas.");
    }
}

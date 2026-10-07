package pe.edu.unt.tecleollave;

import android.app.AppOpsManager;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(name = "AndroidSecurityBridge")
public class AndroidSecurityBridgePlugin extends Plugin {

    private static AndroidSecurityBridgePlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static void notifyChallengeReceived(String targetPackage) {
        if (instance != null) {
            JSObject data = new JSObject();
            data.put("targetPackage", targetPackage);
            instance.notifyListeners("onAppChallenge", data);
        }
    }

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        new Thread(() -> {
            try {
                Context context = getContext();
                PackageManager pm = context.getPackageManager();

                Intent intent = new Intent(Intent.ACTION_MAIN, null);
                intent.addCategory(Intent.CATEGORY_LAUNCHER);

                List<ResolveInfo> activities = pm.queryIntentActivities(intent, 0);
                List<JSObject> appList = new ArrayList<>();

                for (ResolveInfo ri : activities) {
                    if (ri.activityInfo == null || ri.activityInfo.packageName == null) continue;
                    String pkg = ri.activityInfo.packageName;
                    if (pkg.equals(context.getPackageName())) continue; // Excluir nuestra propia app

                    String label = ri.loadLabel(pm).toString();
                    Drawable iconDrawable = ri.loadIcon(pm);
                    String iconBase64 = drawableToBase64(iconDrawable);
                    boolean isSystem = (ri.activityInfo.applicationInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0;

                    JSObject appObj = new JSObject();
                    appObj.put("packageName", pkg);
                    appObj.put("name", label);
                    appObj.put("icon", iconBase64 != null ? iconBase64 : "");
                    appObj.put("isSystemApp", isSystem);

                    appList.add(appObj);
                }

                // Ordenar: primero apps de usuario por nombre, luego apps de sistema
                Collections.sort(appList, new Comparator<JSObject>() {
                    @Override
                    public int compare(JSObject a, JSObject b) {
                        boolean sysA = a.optBoolean("isSystemApp", false);
                        boolean sysB = b.optBoolean("isSystemApp", false);
                        if (sysA != sysB) {
                            return sysA ? 1 : -1;
                        }
                        return a.getString("name", "").compareToIgnoreCase(b.getString("name", ""));
                    }
                });

                JSArray appsArray = new JSArray();
                for (JSObject obj : appList) {
                    appsArray.put(obj);
                }

                JSObject ret = new JSObject();
                ret.put("apps", appsArray);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Error al obtener aplicaciones instaladas: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        Context context = getContext();
        boolean usageStats = hasUsageStatsPermission(context);
        boolean overlay = Settings.canDrawOverlays(context);
        boolean deviceSecure = isDeviceSecure(context);

        JSObject ret = new JSObject();
        ret.put("usageStats", usageStats);
        ret.put("overlay", overlay);
        ret.put("deviceSecure", deviceSecure);
        call.resolve(ret);
    }

    @PluginMethod
    public void openUsageSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo abrir configuración de acceso de uso: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        try {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo abrir configuración de superposición: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openSecuritySettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_SECURITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("No se pudo abrir configuración de seguridad: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getDeviceSecurityStatus(PluginCall call) {
        Context context = getContext();
        KeyguardManager km = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
        boolean isSecure = km != null && km.isDeviceSecure();
        boolean isLocked = km != null && km.isKeyguardLocked();

        JSObject ret = new JSObject();
        ret.put("isDeviceSecure", isSecure);
        ret.put("isKeyguardLocked", isLocked);
        call.resolve(ret);
    }

    @PluginMethod
    public void startAppLockerService(PluginCall call) {
        try {
            Context context = getContext();
            JSArray pkgsArray = call.getArray("protectedPackages");
            boolean isEnrolled = call.getBoolean("isEnrolled", false);
            String phrase = call.getString("phrase", "seguridad unt 2026");

            Set<String> set = new HashSet<>();
            if (pkgsArray != null) {
                for (int i = 0; i < pkgsArray.length(); i++) {
                    try {
                        set.add(pkgsArray.getString(i));
                    } catch (Exception ignored) {}
                }
            }

            AppLockerService.updateConfiguration(context, set, isEnrolled, phrase);

            Intent serviceIntent = new Intent(context, AppLockerService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Error al iniciar servicio: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopAppLockerService(PluginCall call) {
        try {
            Context context = getContext();
            Intent serviceIntent = new Intent(context, AppLockerService.class);
            context.stopService(serviceIntent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Error al detener servicio: " + e.getMessage());
        }
    }

    @PluginMethod
    public void unlockPackage(PluginCall call) {
        String pkg = call.getString("packageName");
        if (pkg != null) {
            AppLockerService.unlockPackageForSession(pkg);
        }
        call.resolve();
    }

    @PluginMethod
    public void minimizeApp(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().moveTaskToBack(true);
            } catch (Exception ignored) {}
        });
        call.resolve();
    }

    @PluginMethod
    public void promptDeviceCredential(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                Context context = getContext();
                KeyguardManager km = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
                if (km != null && km.isDeviceSecure()) {
                    Intent intent = km.createConfirmDeviceCredentialIntent(
                        "Desbloqueo de Seguridad",
                        "Verifica tu identidad con tu PIN, patrón o huella"
                    );
                    if (intent != null) {
                        startActivityForResult(call, intent, "deviceCredentialResult");
                        return;
                    }
                }
                call.reject("El dispositivo no tiene método seguro configurado");
            } catch (Exception e) {
                call.reject("Error al solicitar credencial: " + e.getMessage());
            }
        });
    }

    @com.getcapacitor.annotation.ActivityCallback
    private void deviceCredentialResult(PluginCall call, androidx.activity.result.ActivityResult result) {
        JSObject ret = new JSObject();
        boolean success = (result.getResultCode() == android.app.Activity.RESULT_OK);
        ret.put("success", success);
        call.resolve(ret);
    }

    @PluginMethod
    public void getPendingChallenge(PluginCall call) {
        String target = MainActivity.pendingChallengePackage;
        MainActivity.pendingChallengePackage = null;
        JSObject ret = new JSObject();
        ret.put("hasChallenge", target != null && !target.isEmpty());
        ret.put("targetPackage", target != null ? target : "");
        call.resolve(ret);
    }

    private boolean hasUsageStatsPermission(Context context) {
        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        if (appOps == null) return false;
        int mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            context.getPackageName()
        );
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    private boolean isDeviceSecure(Context context) {
        KeyguardManager km = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
        return km != null && km.isDeviceSecure();
    }

    private String drawableToBase64(Drawable drawable) {
        if (drawable == null) return null;
        try {
            Bitmap bitmap;
            if (drawable instanceof BitmapDrawable) {
                bitmap = ((BitmapDrawable) drawable).getBitmap();
            } else {
                int width = Math.max(1, drawable.getIntrinsicWidth());
                int height = Math.max(1, drawable.getIntrinsicHeight());
                if (width > 96 || height > 96) {
                    width = 72;
                    height = 72;
                }
                bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(bitmap);
                drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
                drawable.draw(canvas);
            }
            ByteArrayOutputStream stream = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 85, stream);
            byte[] byteArray = stream.toByteArray();
            return "data:image/png;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP);
        } catch (Exception e) {
            return null;
        }
    }
}

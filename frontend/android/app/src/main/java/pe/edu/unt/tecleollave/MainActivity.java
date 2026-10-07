package pe.edu.unt.tecleollave;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static volatile String pendingChallengePackage = null;
    public static volatile boolean isAppInForeground = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidSecurityBridgePlugin.class);
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    public void onResume() {
        super.onResume();
        isAppInForeground = true;
    }

    @Override
    public void onPause() {
        super.onPause();
        isAppInForeground = false;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && "CHALLENGE".equals(intent.getStringExtra("ACTION"))) {
            String target = intent.getStringExtra("TARGET_PACKAGE");
            if (target != null && !target.isEmpty()) {
                pendingChallengePackage = target;
                AndroidSecurityBridgePlugin.notifyChallengeReceived(target);
            }
        }
    }
}

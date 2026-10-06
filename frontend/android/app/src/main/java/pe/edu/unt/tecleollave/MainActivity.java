package pe.edu.unt.tecleollave;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static volatile String pendingChallengePackage = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidSecurityBridgePlugin.class);
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
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

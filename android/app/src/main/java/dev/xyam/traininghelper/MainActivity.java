package dev.xyam.traininghelper;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import dev.xyam.traininghelper.timer.TrainingPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Los plugins propios se registran antes de super.onCreate
        registerPlugin(TrainingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

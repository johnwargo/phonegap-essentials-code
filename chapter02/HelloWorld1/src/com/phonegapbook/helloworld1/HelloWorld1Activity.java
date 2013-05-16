package com.phonegapbook.helloworld1;

import android.os.Bundle;
import com.phonegap.*;

public class HelloWorld1Activity extends DroidGap {
    /** Called when the activity is first created. */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.loadUrl("file:///android_asset/www/index.html");
    }
}
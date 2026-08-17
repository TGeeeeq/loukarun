package org.nechmerust.loukarun;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();
        lockTextZoom();
    }

    /* SYSTÉMOVÉ ZVĚTŠENÍ PÍSMA SE DO HRY NEPŘENÁŠÍ.

       WebView bere Nastavení → Displej → Velikost písma a přenásobí jím
       výchozí velikost písma stránky. Všechno v rem a em naroste o 15–30 %,
       ale obálky a odstupy zadané v px zůstanou – obsah se přestane vejít
       a spodní tlačítka zmizí pod okrajem displeje. Hra je na šířku,
       naskládaná na pixel a už si sama škáluje podle velikosti displeje
       (--gvw/--gvh v style.css), takže tady systémové zvětšení nemá co
       zlepšit, jen co rozbít.

       V CSS je 1rem pevně 16 px, což na to samo stačí; setTextZoom(100) je
       druhá, nezávislá pojistka – kdyby někdo v CSS pevnou velikost zrušil,
       WebView už písmo nezvětší. */
    private void lockTextZoom() {
        try {
            getBridge().getWebView().getSettings().setTextZoom(100);
        } catch (Exception e) {
            // most Capacitoru ještě není hotový – hra běží dál, brzdí jen CSS
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}

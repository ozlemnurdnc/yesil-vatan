// Yeşil Vatan - uygulamanın beyni
// Bu dosyayı SEN yazacaksın. Tema (index.html + style.css) hazır.

// Kısayol: $("#id") ile bir elemanı seç
const $ = (s) => document.querySelector(s);

// ============================================================
// GÖREV 1 (bu gece): Sekmeler arası geçiş
// ------------------------------------------------------------
// Alttaki menüde 5 buton var: <button data-tab="home">, "map", "events", "protect", "profile"
// Sayfada 5 bölüm var: <section id="tab-home" class="tab">, "tab-map" ...
// Sadece "active" sınıfı olan bölüm görünür (style.css böyle ayarlı).
//
// Yapman gereken:
//  1) openTab(isim) diye bir fonksiyon yaz:
//     - bütün .tab bölümlerinden "active" sınıfını kaldır
//     - id'si "tab-" + isim olan bölüme "active" ekle
//     - alttaki butonlarda da aynısını yap (hangi buton seçiliyse o yeşil olsun)
//  2) alttaki her butona tıklanınca openTab(buton.dataset.tab) çalışsın
//
// İpuçları: document.querySelectorAll(".tab"), forEach, classList.add / remove / toggle,
//           addEventListener("click", ...)
// ============================================================



// ============================================================
// GÖREV 2 (bu gece): Açılış ekranını kapat
// ------------------------------------------------------------
// #splashGo butonuna basınca #splash elemanına "fade" sınıfı ekle,
// yarım saniye sonra (setTimeout) elemanı tamamen kaldır (.remove()).
// ============================================================


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
// Sekme geçişi: alttaki menüden bir butona basınca ilgili ekranı aç
function openTab(isim) {
  // 1) Bütün ekranları gizle, sadece seçileni göster
  document.querySelectorAll(".tab").forEach(function (ekran) {
    ekran.classList.toggle("active", ekran.id === "tab-" + isim);
  });

  // 2) Alttaki menüde seçili butonu yeşil yap
  document.querySelectorAll(".tabbar button").forEach(function (buton) {
    buton.classList.toggle("active", buton.dataset.tab === isim);
  });

  // 3) Sayfanın en üstüne kaydır
  window.scrollTo(0, 0);
}

// Alttaki menüdeki her butona tıklanınca openTab çalışsın
document.querySelectorAll(".tabbar button").forEach(function (buton) {
  buton.addEventListener("click", function () {
    openTab(buton.dataset.tab);
  });
});


// ============================================================
// GÖREV 2 (bu gece): Açılış ekranını kapat
// ------------------------------------------------------------
// #splashGo butonuna basınca #splash elemanına "fade" sınıfı ekle,
// yarım saniye sonra (setTimeout) elemanı tamamen kaldır (.remove()).
// ============================================================
// Açılış ekranındaki butona tıklanınca ekranı kapat
$("#splashGo").addEventListener("click", function () {
  $("#splash").classList.add("fade");

  setTimeout(function () {
    $("#splash").remove();
  }, 500);
});


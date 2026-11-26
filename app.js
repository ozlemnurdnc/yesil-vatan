// Yeşil Vatan - uygulamanın beyni
// Sekmeler, açılış ekranı, harita, fidanlar ve etkinlikler burada.

// Kısayol: $("#id") ile bir elemanı seç
const $ = (s) => document.querySelector(s);

// ============================================================
// SEKMELER
// ============================================================
function openTab(isim) {
  // 1) Bütün ekranları gizle, sadece seçileni göster
  document.querySelectorAll(".tab").forEach(function (ekran) {
    ekran.classList.toggle("active", ekran.id === "tab-" + isim);
  });

  // 2) Alttaki menüde seçili butonu yeşil yap
  document.querySelectorAll(".tabbar button").forEach(function (buton) {
    buton.classList.toggle("active", buton.dataset.tab === isim);
  });
  // Harita sekmesi açılınca haritayı hazırla
  if (isim === "map") haritayiHazirla();

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
// AÇILIŞ EKRANI
// ============================================================
$("#splashGo").addEventListener("click", function () {
  $("#splash").classList.add("fade");

  setTimeout(function () {
    $("#splash").remove();
  }, 500);
});

// ============================================================
// HARİTA
// ============================================================
let harita = null;                                  // harita bir kere oluşturulacak
const BASLANGIC = { lat: 40.1426, lon: 29.9793 };   // Bilecik
let fidanKatmani = null;
function haritayiHazirla() {
  // Harita daha önce oluşturulmadıysa oluştur
  if (harita === null) {
    harita = L.map("map").setView([BASLANGIC.lat, BASLANGIC.lon], 13);

    // Harita görüntülerini OpenStreetMap'ten al
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(harita);

    // Fidan işaretleri için ayrı bir katman
    fidanKatmani = L.layerGroup().addTo(harita);
  }

  fidanlariCiz();

  // Sekme yeni açıldığı için haritaya boyutunu yeniden hesaplat
  setTimeout(function () { harita.invalidateSize(); }, 100);
}


// "Konumum" butonu: haritayı kullanıcının bulunduğu yere götür
$("#btnMe").addEventListener("click", function () {
if (harita === null) haritayiHazirla();   // harita yoksa önce oluştur
  navigator.geolocation.getCurrentPosition(
    function (konum) {
      const lat = konum.coords.latitude;
      const lon = konum.coords.longitude;
      harita.setView([lat, lon], 16);
      L.circleMarker([lat, lon], { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 })
        .addTo(harita).bindPopup("Buradasın").openPopup();
    },
    function () {
      alert("Konum alınamadı. Tarayıcıya konum izni verdiğinden emin ol.");
    }
  );
});
// ============================================================
// VERİLER
// Şimdilik telefonda (localStorage) saklanıyor.
// Firebase'e geçince sadece bu bölüm değişecek.
// ============================================================
const veri = {
  fidanlar: JSON.parse(localStorage.getItem("fidanlar") || "[]"),

  kaydet: function () {
    localStorage.setItem("fidanlar", JSON.stringify(this.fidanlar));
  },

  fidanEkle: function (fidan) {
    this.fidanlar.push(fidan);
    this.kaydet();
  },
  fidanSula: function(sira){
    this.fidanlar[sira].sonSulama=Date.now();
    this.kaydet();
  },
};

// ============================================================
// FİDANLAR
// ============================================================
const GUN = 24 * 60 * 60 * 1000;   // bir günün milisaniye karşılığı
const SUSUZ_GUN = 7;               // 7 gün sulanmazsa "su bekliyor" sayılır

// Fidan kaç gündür sulanmadı?
function kacGunOldu(zaman) {
  return Math.floor((Date.now() - zaman) / GUN);
}

// Bütün fidanları haritaya çiz
function fidanlariCiz() {
  if (harita === null) return;      // harita henüz yoksa çizme
  fidanKatmani.clearLayers();       // eski işaretleri temizle

  veri.fidanlar.forEach(function (fidan, sira) {
    const susuz = kacGunOldu(fidan.sonSulama) >= SUSUZ_GUN;
    const simge = susuz ? "🥀" : "🌳";

    L.marker([fidan.lat, fidan.lon], {
      icon: L.divIcon({ className: "", html: '<div class="emoji-marker">' + simge + "</div>", iconSize: [28, 28] }),
    })
      .addTo(fidanKatmani)
      .bindPopup("<b>" + (fidan.isim || fidan.tur) + "</b><br>" +
                 fidan.tur + " · " + fidan.kim + " dikti<br>" +
                 "Son sulama: " + kacGunOldu(fidan.sonSulama) + " gün önce<br>" +
                 '<button class="btn small" onclick="sula(' + sira + ')">💧 Suladım</button>');
  });
}


// ============================================================
// KÜÇÜK BİLDİRİM (ekranın altında 2,5 saniye görünen mesaj)
// ============================================================
function bildir(mesaj) {
  $("#toast").textContent = mesaj;
  $("#toast").classList.remove("hidden");
  setTimeout(function () { $("#toast").classList.add("hidden"); }, 2500);
}
// ============================================================
// HARİTADAN YER SEÇME
// ============================================================
let secimTuru = null;   // ne için yer seçiliyor: "tree", "event" ya da "report"

// "Fidan dik", "Etkinlik aç", "Ağacı koru" butonlarının hepsi buraya gelir
document.querySelectorAll("[data-add]").forEach(function (buton) {
  buton.addEventListener("click", function () {
    yerSecmeyiBaslat(buton.dataset.add);
  });
});

// Yer seçmeyi başlat: haritayı aç, ✚ ve "Burayı seç" çubuğunu göster
function yerSecmeyiBaslat(tur) {
  secimTuru = tur;
  openTab("map");
  $("#pickBar").classList.remove("hidden");
  $("#crosshair").classList.remove("hidden");
  $("#mapTools").classList.add("hidden");
}

// Yer seçmeyi bitir: her şeyi eski hâline getir
function yerSecmeyiBitir() {
  secimTuru = null;
  $("#pickBar").classList.add("hidden");
  $("#crosshair").classList.add("hidden");
  $("#mapTools").classList.remove("hidden");
}

// "İptal" butonu
$("#pickCancel").addEventListener("click", yerSecmeyiBitir);

// ============================================================
// FİDAN DİKME FORMU
// ============================================================
const TURLER = ["Çınar", "Meşe", "Ihlamur", "Kızılçam", "Sedir", "Akasya", "İğde", "Zeytin", "Erik", "Dut", "Diğer"];

// Formu aç (lat, lon: fidanın dikileceği yer)
function fidanFormunuAc(lat, lon) {
  const form = $("#sheetForm");

  // Türler listesinden açılır menü seçenekleri oluştur
  let secenekler = "";
  TURLER.forEach(function (t) {
    secenekler += "<option>" + t + "</option>";
  });

  // Formun içeriğini yaz
  form.innerHTML =
    '<h3>🌱 Fidan dik</h3>' +
    '<label class="field">Ağaç türü <select id="fTur">' + secenekler + '</select></label>' +
    '<label class="field">Fidanına bir isim ver (isteğe bağlı) <input id="fIsim" maxlength="40" placeholder="ör. Cumhuriyet Çınarı"></label>' +
    '<label class="field">Senin adın <input id="fKim" required maxlength="30"></label>' +
    '<button class="btn full" type="submit">Diktim! 🌱</button>' +
    '<button class="btn ghost full" type="button" id="fVazgec">Vazgeç</button>';

  // Daha önce adını yazdıysan hatırla
  $("#fKim").value = localStorage.getItem("ad") || "";

  // Seçilen yeri forma not et (kaydederken lazım olacak)
  form.dataset.tur = "tree";
  form.dataset.lat = lat;
  form.dataset.lon = lon;

  // Vazgeç butonu formu kapatsın
  $("#fVazgec").addEventListener("click", formuKapat);

  // Formu göster
  $("#sheet").classList.remove("hidden");
}

// Formu kapat
function formuKapat() {
  $("#sheet").classList.add("hidden");
}
// ============================================================
// BUTONLARI BAĞLA
// ============================================================

// "Burayı seç": haritanın tam ortasındaki noktayı al ve formu aç
$("#pickOk").addEventListener("click", function () {
  const merkez = harita.getCenter();
  const tur = secimTuru;
  yerSecmeyiBitir();

  if (tur === "tree") {
    fidanFormunuAc(merkez.lat, merkez.lng);
  } else {
    bildir("Bu özellik yakında geliyor 🙂");
  }
});

// "Konumum" (yer seçerken): haritayı bulunduğun yere götür
$("#pickMe").addEventListener("click", function () {
  navigator.geolocation.getCurrentPosition(
    function (konum) {
      harita.setView([konum.coords.latitude, konum.coords.longitude], 18);
    },
    function () {
      bildir("Konum alınamadı");
    }
  );
});

// "Diktim!": formdaki bilgilerle yeni fidanı kaydet
$("#sheetForm").addEventListener("submit", function (olay) {
  olay.preventDefault();          // sayfanın yenilenmesini engelle
  const form = $("#sheetForm");

  if (form.dataset.tur === "tree") {
    const kim = $("#fKim").value.trim();
    localStorage.setItem("ad", kim);   // adını bir dahaki sefere hatırla

    veri.fidanEkle({
      lat: Number(form.dataset.lat),
      lon: Number(form.dataset.lon),
      tur: $("#fTur").value,
      isim: $("#fIsim").value.trim(),
      kim: kim,
      dikildi: Date.now(),
      sonSulama: Date.now(),
    });

    formuKapat();
    fidanlariCiz();
    bildir("🌱 Fidanın ormana eklendi!");
  }
});
// Haritadaki "Suladım" butonu
function sula(sira) {
  veri.fidanSula(sira);
 fidanlariCiz();
 bildir("💧 Teşekkürler, fidan sulandı!");
}
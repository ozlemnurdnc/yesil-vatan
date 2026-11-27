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
  etkinlikler: JSON.parse(localStorage.getItem("etkinlikler") || "[]"),

  // Hem fidanları hem etkinlikleri kaydet
  kaydet: function () {
    localStorage.setItem("fidanlar", JSON.stringify(this.fidanlar));
    localStorage.setItem("etkinlikler", JSON.stringify(this.etkinlikler));
  },

  fidanEkle: function (fidan) {
    this.fidanlar.push(fidan);
    this.kaydet();
  },

  fidanSula: function (sira) {
    this.fidanlar[sira].sonSulama = Date.now();
    this.kaydet();
  },

  etkinlikEkle: function (etkinlik) {
    this.etkinlikler.push(etkinlik);
    this.kaydet();
  },

  // Bir kişiyi etkinliğe ekle (zaten katılıyorsa tekrar ekleme)
  etkinligeKatil: function (sira, kisi) {
    const katilanlar = this.etkinlikler[sira].katilanlar;
    if (!katilanlar.includes(kisi)) {
      katilanlar.push(kisi);
      this.kaydet();
    }
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
  anaSayfayiGuncelle();
  if (harita === null) return;      // harita henüz yoksa çizme
  fidanKatmani.clearLayers();       // eski işaretleri temizle

  veri.fidanlar.forEach(function (fidan, sira) {
    const susuz = kacGunOldu(fidan.sonSulama) >= SUSUZ_GUN;
    if(filtre==="susuz" && !susuz) return;
    
    if(filtre==="saglikli" && susuz) return;
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
  susuzListesiniGoster();
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
  } else if (tur === "event") {
    etkinlikFormunuAc(merkez.lat, merkez.lng);
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
    } else if (form.dataset.tur === "event") {
    const kim = $("#eKim").value.trim();
    localStorage.setItem("ad", kim);

    veri.etkinlikEkle({
      baslik: $("#eBaslik").value.trim(),
      tarih: new Date($("#eTarih").value + "T10:00").getTime(),
      yer: $("#eYer").value.trim(),
      lat: Number(form.dataset.lat),
      lon: Number(form.dataset.lon),
      kim: kim,
      katilanlar: [kim],
    });

    formuKapat();
    bildir("📅 Etkinlik yayında!");
  }
});
// Haritadaki "Suladım" butonu
function sula(sira) {
  veri.fidanSula(sira);
 fidanlariCiz();
 bildir("💧 Teşekkürler, fidan sulandı!");
}
// ============================================================
// SU BEKLEYEN FİDANLAR LİSTESİ
// ============================================================
function susuzListesiniGoster() {
  const kutu = $("#thirstyList");
  kutu.innerHTML = "";          // önce listeyi temizle
  let bulundu = false;

  veri.fidanlar.forEach(function (fidan, sira) {
    const gun = kacGunOldu(fidan.sonSulama);
    if (gun < SUSUZ_GUN) return;   // susuz değilse bu fidanı atla
    bulundu = true;

    kutu.innerHTML +=
      '<div class="item">' +
        '<div class="thumb">🥀</div>' +
        '<div class="body">' +
          '<div class="title">' + (fidan.isim || fidan.tur) + '</div>' +
          '<div class="sub">' + fidan.tur + ' · ' + fidan.kim + ' dikti · ' + gun + ' gündür susuz</div>' +
        '</div>' +
        '<div class="acts">' +
          '<button class="btn small" onclick="sula(' + sira + ')">💧 Suladım</button>' +
          '<button class="btn small ghost" onclick="fidanaGit(' + sira + ')">Haritada</button>' +
        '</div>' +
      '</div>';
  });

  // Hiç susuz fidan yoksa güzel bir mesaj göster
  if (!bulundu) {
    kutu.innerHTML = '<div class="empty">🎉 Bütün fidanlar sulanmış!</div>';
  }
}

// "Haritada" butonu: haritayı o fidana götür ve sayfanın en üstüne çık
function fidanaGit(sira) {
  const fidan = veri.fidanlar[sira];
  harita.setView([fidan.lat, fidan.lon], 18);
  window.scrollTo(0, 0);
}
// ============================================================
// ANA SAYFA SAYILARI
// ============================================================
function anaSayfayiGuncelle() {
  // 1) Toplam fidan sayısı
  // ↓↓↓ BU SATIRI SEN YAZACAKSIN ↓↓↓
  $("#statTrees").textContent = veri.fidanlar.length;

  // 2) Gönüllü sayısı: fidan diken farklı kişilerin sayısı
  //    (Set, aynı ismi iki kez saymayan bir liste)
  const kisiler = new Set();
  veri.fidanlar.forEach(function (fidan) { kisiler.add(fidan.kim); });
  $("#statPeople").textContent = kisiler.size;

  // 3) Su bekleyen fidan sayısı
  let susuzSayisi = 0;
  veri.fidanlar.forEach(function (fidan) {
    if (kacGunOldu(fidan.sonSulama) >= SUSUZ_GUN) susuzSayisi++;
  });
  $("#statThirsty").textContent = susuzSayisi;
}

// Ana sayfadaki "💧 Fidan sula" butonu: su bekleyenler listesine götür
$("[data-go]").addEventListener("click", function () {
  openTab("map");
  setTimeout(function () {
    $("#thirstyList").scrollIntoView({ behavior: "smooth" });
  }, 200);
});

// Sayfa açılınca sayıları bir kere hesapla
anaSayfayiGuncelle();
// ============================================================
// HARİTA FİLTRESİ (sağlıklı / su bekliyor)
// ============================================================
let filtre = "hepsi";   // "hepsi", "saglikli" ya da "susuz"

document.querySelectorAll("[data-filtre]").forEach(function (yazi) {
  yazi.addEventListener("click", function () {
    // Seçili olana tekrar tıklandıysa filtreyi kaldır, değilse onu seç
    if (filtre === yazi.dataset.filtre) {
      filtre = "hepsi";
    } else {
      filtre = yazi.dataset.filtre;
    }

    // Seçili yazıyı yeşil yap, diğerlerini normal
    document.querySelectorAll("[data-filtre]").forEach(function (y) {
      y.classList.toggle("secili", y.dataset.filtre === filtre);
    });

    fidanlariCiz();
  });
});
// ============================================================
// ETKİNLİK AÇMA FORMU
// ============================================================
function etkinlikFormunuAc(lat, lon) {
  const form = $("#sheetForm");

  // Varsayılan tarih: yarın (YYYY-AA-GG biçiminde)
  const yarin = new Date(Date.now() + GUN).toISOString().slice(0, 10);

  form.innerHTML =
    '<h3>📅 Dikim etkinliği aç</h3>' +
    '<label class="field">Başlık <input id="eBaslik" required maxlength="60" placeholder="ör. Okul bahçesine 20 fidan"></label>' +
    '<label class="field">Tarih <input id="eTarih" type="date" required value="' + yarin + '"></label>' +
    '<label class="field">Buluşma yeri <input id="eYer" required maxlength="60" placeholder="ör. Park girişi"></label>' +
    '<label class="field">Senin adın <input id="eKim" required maxlength="30"></label>' +
    '<button class="btn full" type="submit">Etkinliği yayınla 📅</button>' +
    '<button class="btn ghost full" type="button" id="eVazgec">Vazgeç</button>';

  $("#eKim").value = localStorage.getItem("ad") || "";

  form.dataset.tur = "event";
  form.dataset.lat = lat;
  form.dataset.lon = lon;

  $("#eVazgec").addEventListener("click", formuKapat);
  $("#sheet").classList.remove("hidden");
}
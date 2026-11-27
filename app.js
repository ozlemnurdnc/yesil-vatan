// Yeşil Vatan - uygulamanın beyni
// Sekmeler, açılış ekranı, harita, fidanlar ve etkinlikler burada.

// Kısayol: $("#id") ile bir elemanı seç
const $ = (s) => document.querySelector(s);

// ============================================================
// FIREBASE BAĞLANTISI
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyACi-qwU70Pi-O2_M3wpv39LkbW3Yv0fq0",
  authDomain: "yesil-vatan-d5a82.firebaseapp.com",
  projectId: "yesil-vatan-d5a82",
  storageBucket: "yesil-vatan-d5a82.firebasestorage.app",
  messagingSenderId: "126882864615",
  appId: "1:126882864615:web:a78c0a836aed565fba7142",
};
firebase.initializeApp(firebaseConfig);   // Firebase'i başlat
const db = firebase.firestore();          // veritabanına bağlan

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
// VERİLER
const veri = {
  fidanlar: [],       // Firebase'den gelen fidanlar burada tutulur
  etkinlikler: [],    // Firebase'den gelen etkinlikler burada tutulur

  // Yeni fidanı Firebase'e ekle
  fidanEkle: function (fidan) {
    db.collection("fidanlar").add(fidan);
  },

  // Fidanın son sulama zamanını Firebase'de güncelle
  fidanSula: function (sira) {
    const id = this.fidanlar[sira].id;
    db.collection("fidanlar").doc(id).update({ sonSulama: Date.now() });
  },

  // Yeni etkinliği Firebase'e ekle
  etkinlikEkle: function (etkinlik) {
    db.collection("etkinlikler").add(etkinlik);
  },

  // Kişiyi etkinliğin katılımcılarına ekle (zaten varsa tekrar eklemez)
  etkinligeKatil: function (sira, kisi) {
    const id = this.etkinlikler[sira].id;
    db.collection("etkinlikler").doc(id).update({
      katilanlar: firebase.firestore.FieldValue.arrayUnion(kisi),
    });
  },
};

// Firebase'de fidanlar değişince (biri fidan dikince ya da sulayınca) otomatik güncelle
db.collection("fidanlar").onSnapshot(function (sonuc) {
  veri.fidanlar = sonuc.docs.map(function (belge) {
    return Object.assign({ id: belge.id }, belge.data());
  });
  fidanlariCiz();
});

// Firebase'de etkinlikler değişince otomatik güncelle
db.collection("etkinlikler").onSnapshot(function (sonuc) {
  veri.etkinlikler = sonuc.docs.map(function (belge) {
    return Object.assign({ id: belge.id }, belge.data());
  });
  etkinlikleriGoster();
});
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

    if(filtre==="etkinlik") return;

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
  if(filtre==="hepsi"|| filtre==="etkinlik") etkinlikleriCiz();
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
    etkinlikleriGoster();
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
// ============================================================
// ETKİNLİK LİSTESİ
// ============================================================
// Tarihi "28 Kasım Cumartesi" gibi yazar
function tarihYaz(zaman) {
  return new Date(zaman).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
}

// Bir etkinlik için liste satırı oluşturur
function etkinlikSatiri(etkinlik, sira) {
  const ad = localStorage.getItem("ad");
  const katiliyor = etkinlik.katilanlar.includes(ad);

  return '<div class="item">' +
      '<div class="thumb">📅</div>' +
      '<div class="body">' +
        '<div class="title">' + etkinlik.baslik + '</div>' +
        '<div class="sub">' + tarihYaz(etkinlik.tarih) + '<br>' +
          etkinlik.yer + ' · ' + etkinlik.katilanlar.length + ' kişi katılıyor</div>' +
      '</div>' +
      '<div class="acts">' +
        (katiliyor
          ? '<button class="btn small done">Katılıyorsun ✓</button>'
          : '<button class="btn small" onclick="katil(' + sira + ')">Katıl</button>') +
      '</div>' +
    '</div>';
}

// Etkinlik sekmesini ve ana sayfadaki listeyi doldurur
function etkinlikleriGoster() {
  // Her etkinliğin listedeki sırasını da yanında tut (Katıl butonu için lazım)
  let yaklasanlar = [];
  veri.etkinlikler.forEach(function (etkinlik, sira) {
    if (etkinlik.tarih > Date.now() - GUN) {          // geçmiş etkinlikleri gösterme
      yaklasanlar.push({ etkinlik: etkinlik, sira: sira });
    }
  });

  // Tarihe göre sırala: en yakın etkinlik en üstte
  yaklasanlar.sort(function (a, b) { return a.etkinlik.tarih - b.etkinlik.tarih; });

  // Etkinlik sekmesi: hepsi
  let hepsi = "";
  yaklasanlar.forEach(function (x) { hepsi += etkinlikSatiri(x.etkinlik, x.sira); });
  $("#eventList").innerHTML = hepsi || '<div class="empty">Yaklaşan etkinlik yok. İlkini sen aç!</div>';

  // Ana sayfa: ilk 3 tanesi
  let ilkUc = "";
  yaklasanlar.slice(0, 3).forEach(function (x) { ilkUc += etkinlikSatiri(x.etkinlik, x.sira); });
  $("#homeEvents").innerHTML = ilkUc || '<div class="empty">Yaklaşan etkinlik yok. İlkini sen aç!</div>';
  fidanlariCiz();   // haritayı da güncelle
}

// Sayfa açılınca etkinlikleri göster
etkinlikleriGoster();
function katil(sira) {
  const ad = localStorage.getItem("ad") || "Misafir";
  veri.etkinligeKatil(sira,ad);
  etkinlikleriGoster();
  bildir("🤝 Etkinliğe katıldın!");
}
// ============================================================
// ETKİNLİKLERİ HARİTAYA ÇİZ
// ============================================================
function etkinlikleriCiz() {
  veri.etkinlikler.forEach(function (etkinlik, sira) {
    if (etkinlik.tarih < Date.now() - GUN) return;   // geçmiş etkinlikleri çizme

    L.marker([etkinlik.lat, etkinlik.lon], {
      icon: L.divIcon({ className: "", html: '<div class="emoji-marker">📅</div>', iconSize: [28, 28] }),
    })
      .addTo(fidanKatmani)
      .bindPopup("<b>📅 " + etkinlik.baslik + "</b><br>" +
                 tarihYaz(etkinlik.tarih) + "<br>" +
                 etkinlik.yer + " · " + etkinlik.katilanlar.length + " kişi katılıyor<br>" +
                 '<button class="btn small" onclick="katil(' + sira + ')">Katıl</button>');
  });
}
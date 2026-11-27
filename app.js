// Yeşil Vatan - uygulamanın beyni
// Sekmeler, açılış ekranı, harita, fidanlar ve etkinlikler burada.

// Kısayol: $("#id") ile bir elemanı seç
const $ = (s) => document.querySelector(s);


// FIREBASE BAĞLANTISI
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


// SEKMELER
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



// AÇILIŞ EKRANI
$("#splashGo").addEventListener("click", function () {
  $("#splash").classList.add("fade");

  setTimeout(function () {
    $("#splash").remove();
  }, 500);
});


// HARİTA
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
  raporlar: [],       // Firebase'den gelen ağaç koruma bildirimleri
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
  
  // Yeni ağaç koruma bildirimi ekle
  raporEkle: function (rapor) {
    db.collection("raporlar").add(rapor);
  },

  // Bildirime destek ver (aynı kişi iki kez sayılmaz)
  raporaDestekVer: function (sira, kisi) {
    const id = this.raporlar[sira].id;
    db.collection("raporlar").doc(id).update({
      destekler: firebase.firestore.FieldValue.arrayUnion(kisi),
    });
  },

  // Ağaç kurtarıldı olarak işaretle
  korunduYap: function (sira) {
    const id = this.raporlar[sira].id;
    db.collection("raporlar").doc(id).update({ durum: "korundu" });
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

// Firebase'de bildirimler değişince otomatik güncelle
db.collection("raporlar").onSnapshot(function (sonuc) {
  veri.raporlar = sonuc.docs.map(function (belge) {
    return Object.assign({ id: belge.id }, belge.data());
  });
  raporlariGoster();
  fidanlariCiz();
});
// FİDANLAR
const GUN = 24 * 60 * 60 * 1000;   // bir günün milisaniye karşılığı
const SUSUZ_GUN = 7;               // 7 gün sulanmazsa "su bekliyor" sayılır

// PUANLAR VE SEVİYELER ("Ben" sekmesi)
const SEVIYELER = [
  { min: 0,   ad: "Fidan",          simge: "🌱", aciklama: "Yolculuk başlıyor" },
  { min: 40,  ad: "Fidanlık",       simge: "🌿", aciklama: "Fidanların kök salıyor" },
  { min: 120, ad: "Orman Çiftliği", simge: "🌳", aciklama: "Çorak toprağı yeşerten" },
  { min: 300, ad: "Ulu Çınar",      simge: "🏛️", aciklama: "Yürüyen Köşk'ün çınarı gibi kalıcı" },
];
const ROZETLER = [
  { simge: "🌱", ad: "İlk Fidan",      aciklama: "İlk fidanını dik",              kazandi: function (s) { return s.dikim >= 1; } },
  { simge: "🌿", ad: "İğde",           aciklama: "5 fidan dik",                   kazandi: function (s) { return s.dikim >=5; } },
  { simge: "💧", ad: "Can Suyu",       aciklama: "10 kez fidan sula",             kazandi: function (s) { return s.sulama>=10; } },
  { simge: "🤝", ad: "İmececi",        aciklama: "3 etkinliğe katıl",             kazandi: function (s) { return s.etkinlik>=3; } },
  { simge: "🏠", ad: "Yürüyen Köşk",   aciklama: "Bir ağacı korumak için bildir", kazandi: function (s) { return s.koruma>=1; } },
  { simge: "✊", ad: "Ortak Ses",      aciklama: "5 bildirime destek ver",        kazandi: function (s) { return s.destek>=5; } },
  { simge: "🌾", ad: "Orman Çiftliği", aciklama: "Orman Çiftliği seviyesine ulaş", kazandi: function (s) { return s.puan >= 120; } },
  { simge: "🏛️", ad: "Ulu Çınar",      aciklama: "En yüksek seviyeye ulaş",       kazandi: function (s) { return s.puan>=300; } },
  { simge: "🚂", ad: "Bilecik Görüşmesi", aciklama: "Bir etkinlik aç", kazandi: function (s) { return s.acilan>=1; } },
];

// Fidan kaç gündür sulanmadı?
function kacGunOldu(zaman) {
  return Math.floor((Date.now() - zaman) / GUN);
}

// Bütün fidanları haritaya çiz
function fidanlariCiz() {
  anaSayfayiGuncelle();
  profiliGoster();
  if (harita === null) return;      // harita henüz yoksa çizme
  fidanKatmani.clearLayers();       // eski işaretleri temizle

  veri.fidanlar.forEach(function (fidan, sira) {
    const susuz = kacGunOldu(fidan.sonSulama) >= SUSUZ_GUN;
    if(filtre==="susuz" && !susuz) return;
    
    if(filtre==="saglikli" && susuz) return;

    if(filtre==="etkinlik"||filtre==="tehlike") return;

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
  if(filtre==="hepsi"|| filtre==="tehlike") raporlariCiz();
  susuzListesiniGoster();
}



// KÜÇÜK BİLDİRİM
function bildir(mesaj) {
  $("#toast").textContent = mesaj;
  $("#toast").classList.remove("hidden");
  setTimeout(function () { $("#toast").classList.add("hidden"); }, 2500);
}

// HARİTADAN YER SEÇME
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


// FİDAN DİKME FORMU
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

// BUTONLARI BAĞLA
// "Burayı seç": haritanın tam ortasındaki noktayı al ve formu aç
$("#pickOk").addEventListener("click", function () {
  const merkez = harita.getCenter();
  const tur = secimTuru;
  yerSecmeyiBitir();

    if (tur === "tree") {
    fidanFormunuAc(merkez.lat, merkez.lng);
  } else if (tur === "event") {
    etkinlikFormunuAc(merkez.lat, merkez.lng);
  } else if (tur === "report") {
    raporFormunuAc(merkez.lat, merkez.lng);}
  else {
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
    } else if (form.dataset.tur === "report") {
    const kim = $("#rKim").value.trim();
    localStorage.setItem("ad", kim);

    veri.raporEkle({
      baslik: $("#rBaslik").value.trim(),
      aciklama: $("#rAciklama").value.trim(),
      kim: kim,
      lat: Number(form.dataset.lat),
      lon: Number(form.dataset.lon),
      tarih: Date.now(),
      destekler: [kim],
      durum: "acik",
    });

    formuKapat();
    bildir("🪓 Bildirimin yayında. Topluluktan destek toplanıyor!");
  }
});
// Haritadaki "Suladım" butonu
function sula(sira) {
  veri.fidanSula(sira);
  localStorage.setItem("sulamaSayisi", Number(localStorage.getItem("sulamaSayisi") || 0) + 1);
 fidanlariCiz();
 bildir("💧 Teşekkürler, fidan sulandı!");
}

// SU BEKLEYEN FİDANLAR LİSTESİ
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

// ANA SAYFA SAYILARI
function anaSayfayiGuncelle() {
  // 1) Toplam fidan sayısı
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
   // 4) Korunan ağaç sayısı
  let korunanSayisi = 0;
  veri.raporlar.forEach(function (rapor) {
    if (rapor.durum === "korundu") korunanSayisi++;
  });
  $("#statSaved").textContent=korunanSayisi;

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

// HARİTA FİLTRESİ (sağlıklı / su bekliyor)
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

// ETKİNLİK AÇMA FORMU
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

// ETKİNLİK LİSTESİ
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

// ETKİNLİKLERİ HARİTAYA ÇİZ
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
// AĞAÇ KORUMA BİLDİRİM FORMU
function raporFormunuAc(lat, lon) {
  const form = $("#sheetForm");

  form.innerHTML =
    '<h3>🪓 Ağacı koru</h3>' +
    '<p class="muted">Kesilmek üzere, zarar görmüş ya da bakımsız bir ağaç mı var?</p>' +
    '<label class="field">Kısa başlık <input id="rBaslik" required maxlength="60" placeholder="ör. Yaşlı çınar kesilecek"></label>' +
    '<label class="field">Açıklama <textarea id="rAciklama" rows="3" maxlength="300" placeholder="Ne oluyor? Ne yapılabilir?"></textarea></label>' +
    '<label class="field">Senin adın <input id="rKim" required maxlength="30"></label>' +
    '<button class="btn full red" type="submit">Bildir 🪓</button>' +
    '<button class="btn ghost full" type="button" id="rVazgec">Vazgeç</button>';

  $("#rKim").value = localStorage.getItem("ad") || "";

  form.dataset.tur = "report";
  form.dataset.lat = lat;
  form.dataset.lon = lon;

  $("#rVazgec").addEventListener("click", formuKapat);
  $("#sheet").classList.remove("hidden");
}
// AĞAÇ KORUMA LİSTESİ
function raporlariGoster() {
  const ad = localStorage.getItem("ad");
  let html = "";

  // Açık bildirimler önce, korunanlar sonra gelsin
  let liste = veri.raporlar.map(function (rapor, sira) { return { rapor: rapor, sira: sira }; });
  liste.sort(function (a, b) {
    if (a.rapor.durum !== b.rapor.durum) return a.rapor.durum === "acik" ? -1 : 1;
    return b.rapor.destekler.length - a.rapor.destekler.length;   // en çok destek alan üstte
  });

  liste.forEach(function (x) {
    const r = x.rapor;
    const korundu = r.durum === "korundu";
    const destekliyor = r.destekler.includes(ad);

    let butonlar = "";
    if (!korundu) {
      butonlar =
        (destekliyor
          ? '<button class="btn small done">Destekliyorsun ✓</button>'
          : '<button class="btn small" onclick="destekle(' + x.sira + ')">✊ Destekle</button>') +
        '<button class="btn small ghost" onclick="korunduIsaretle(' + x.sira + ')">🏠 Korundu</button>';
    }

    html +=
      '<div class="item">' +
        '<div class="thumb">' + (korundu ? "🏠" : "🪓") + '</div>' +
        '<div class="body">' +
          '<div class="title">' + (korundu ? "✅ Korundu: " : "") + r.baslik + '</div>' +
          '<div class="sub">' + (r.aciklama || "") + '<br>' +
            r.kim + ' · ' + tarihYaz(r.tarih) + ' · <b>' + r.destekler.length + ' destek</b></div>' +
        '</div>' +
        '<div class="acts">' + butonlar + '</div>' +
      '</div>';
  });

  $("#reportList").innerHTML = html || '<div class="empty">Henüz bildirim yok.</div>';
}

// "Korundu" butonu
function korunduIsaretle(sira) {
  veri.korunduYap(sira);
  bildir("🏠 Harika! Bu ağaç korundu.");
}
function destekle(sira) {
  const ad = localStorage.getItem("ad") || "Misafir";
  veri.raporaDestekVer(sira,ad);
  bildir("✊ Desteğin eklendi!");
}
// BİLDİRİMLERİ HARİTAYA ÇİZ
function raporlariCiz() {
  veri.raporlar.forEach(function (rapor, sira) {
    if (rapor.durum === "korundu") return;   // korunan ağaçları çizme

    L.marker([rapor.lat, rapor.lon], {
      icon: L.divIcon({ className: "", html: '<div class="emoji-marker">🪓</div>', iconSize: [28, 28] }),
    })
      .addTo(fidanKatmani)
      .bindPopup("<b>🪓 " + rapor.baslik + "</b><br>" +
                 (rapor.aciklama || "") + "<br>" +
                 rapor.destekler.length + " destek<br>" +
                 '<button class="btn small" onclick="destekle(' + sira + ')">✊ Destekle</button>');
  });
}



// Kullanıcının yaptıklarını gerçek verilerden say
function sayaclariHesapla() {
  const ad = localStorage.getItem("ad");
  const s = { dikim: 0, sulama: 0, etkinlik: 0, koruma: 0, destek: 0, acilan: 0 };

  veri.fidanlar.forEach(function (f) { if (f.kim === ad) s.dikim++; });
    veri.etkinlikler.forEach(function (e) {
    if (e.katilanlar.includes(ad)) s.etkinlik++;   // katıldığı etkinlikler
    if (e.kim === ad) s.acilan++;                  // kendi açtığı etkinlikler
  });
  veri.raporlar.forEach(function (r) {
    if (r.kim === ad) s.koruma++;
    else if (r.destekler.includes(ad)) s.destek++;
  });
  s.sulama = Number(localStorage.getItem("sulamaSayisi") || 0);   // sulamalar bu telefonda sayılıyor

  s.puan = s.dikim * 10 + s.koruma * 8 + s.etkinlik * 5 + s.sulama * 2 + s.destek * 1;
  return s;
}

// Puana göre hangi seviyede olduğunu bul
function seviyeBul(puan) {
  let seviye = SEVIYELER[0];
  SEVIYELER.forEach(function (x) { if (puan >= x.min) seviye = x; });
  return seviye;
}

// "Ben" sekmesini ve üstteki seviye kutusunu doldur
function profiliGoster() {
  const s = sayaclariHesapla();
  const seviye = seviyeBul(s.puan);
  const sonraki = SEVIYELER[SEVIYELER.indexOf(seviye) + 1];

  // Üst çubuktaki küçük kutu
  $("#levelChip").textContent = seviye.simge + " " + seviye.ad + " · " + s.puan + " puan";

  // Büyük simge, seviye adı, ilerleme çubuğu
  $("#pLevelIcon").textContent = seviye.simge;
  $("#pLevelName").textContent = seviye.ad + " · " + s.puan + " puan";
  if (sonraki) {
    const yuzde = (s.puan - seviye.min) / (sonraki.min - seviye.min) * 100;
    $("#pBar").style.width = yuzde + "%";
    $("#pNext").textContent = sonraki.simge + " " + sonraki.ad + " seviyesine " + (sonraki.min - s.puan) + " puan kaldı";
  } else {
    $("#pBar").style.width = "100%";
    $("#pNext").textContent = "En yüksek seviyedesin. Ulu Çınar gibi köklüsün! 🏛️";
  }

  // Sayılar
  $("#pPlant").textContent = s.dikim;
  $("#pWater").textContent = s.sulama;
  $("#pJoin").textContent = s.etkinlik;
  $("#pProtect").textContent = s.koruma;

  // Seviyeler listesi (bulunduğun seviye kalın)
  let html = "";
  SEVIYELER.forEach(function (x) {
    html += '<div class="lv' + (x === seviye ? " cur" : "") + '">' +
              '<span class="ic">' + x.simge + '</span>' +
              '<span><b>' + x.ad + '</b> · ' + x.min + '+ puan<br><small class="muted">' + x.aciklama + '</small></span>' +
            '</div>';
  });
  $("#levels").innerHTML = html;

  // İsim kutusu (yazarken üzerine yazmasın diye kontrol ediyoruz)
  if (document.activeElement !== $("#pName")) $("#pName").value = localStorage.getItem("ad") || "";
  
  // Rozetler: kazanılanlar renkli, kazanılmayanlar soluk
  let rozetHtml = "";
  ROZETLER.forEach(function (r) {
    const kazandi = r.kazandi(s);
    rozetHtml += '<div class="badge' + (kazandi ? "" : " locked") + '">' +
                   '<div class="ic">' + r.simge + '</div>' +
                   '<div class="nm">' + r.ad + '</div>' +
                   '<div class="ds">' + r.aciklama + '</div>' +
                 '</div>';
  });
  $("#badges").innerHTML = rozetHtml;
  
  // Yeni seviyeye çıktıysa kutla (sadece daha yükseğe çıkınca)
  const seviyeSirasi = SEVIYELER.indexOf(seviye);
  const enYuksek = Number(localStorage.getItem("enYuksekSeviye") || 0);
  if (seviyeSirasi > enYuksek) {
    bildir("🎉 Yeni seviye: " + seviye.simge + " " + seviye.ad + "!");
    localStorage.setItem("enYuksekSeviye", seviyeSirasi);
  }

  // Yeni rozet kazandıysa kutla (daha önce kazandıklarını tekrar kutlama)
  const eskiRozetler = JSON.parse(localStorage.getItem("kazanilanRozetler") || "[]");
  ROZETLER.forEach(function (r) {
    if (r.kazandi(s) && !eskiRozetler.includes(r.ad)) {
      eskiRozetler.push(r.ad);
      bildir("🏅 Yeni rozet: " + r.simge + " " + r.ad + "!");
    }
  });
  localStorage.setItem("kazanilanRozetler", JSON.stringify(eskiRozetler));
}

// İsim kutusuna yeni bir ad yazılınca
$("#pName").addEventListener("change", function () {
  const yeniAd = $("#pName").value.trim();
  localStorage.setItem("ad", yeniAd);
  bildir("Merhaba " + yeniAd + " 🌱");
  profiliGoster();
  etkinlikleriGoster();
  raporlariGoster();
});
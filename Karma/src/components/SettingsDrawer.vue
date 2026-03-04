<template>
  <div
    v-if="isOpen"
    class="settings-overlay"
    @click="$emit('update:isOpen', false)"
  ></div>
  
  <aside class="settings-drawer" :class="{ open: isOpen }">
    <div class="settings-head">
      <h3>Ayarlar</h3>
      <button class="theme-toggle" @click="$emit('update:isOpen', false)" aria-label="Ayarları Kapat">
        ×
      </button>
    </div>

    <section class="settings-group">
      <h4>PDF Özelleştirme</h4>
      <label class="settings-field">
        <span>Okul adı</span>
        <input v-model="settings.pdf.schoolName" type="text" placeholder="Örn. Zafer İlkokulu" />
      </label>
      <label class="settings-field">
        <span>Sınav adı</span>
        <input v-model="settings.pdf.examName" type="text" placeholder="Örn. LGS Deneme 7" />
      </label>
      <label class="settings-field">
        <span>Tarih</span>
        <CustomDatePicker v-model="settings.pdf.examDate" />
      </label>
    </section>

    <section class="settings-group">
      <div class="settings-row-head">
        <h4>Salon Düzeni</h4>
        <button class="secondary-btn small-btn" @click="$emit('add-salon')">Salon Ekle</button>
      </div>
      <p class="settings-help">
        Sık kullandığınız dizilimleri şablon olarak kaydedebilir ve daha sonra tek tıkla yükleyebilirsiniz.
      </p>

      <div class="template-actions" style="display: flex; gap: 8px; margin-bottom: 24px; align-items: center; flex-wrap: wrap;">
         <button class="secondary-btn small-btn" @click="$emit('save-template')">Şablon Kaydet</button>
         <select :value="selectedTemplateId" @input="$emit('update:selectedTemplateId', ($event.target as HTMLSelectElement).value); $emit('apply-template')" class="template-select" style="padding: 6px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--input-bg); color: var(--text-primary); flex: 1;">
            <option value="">Kayıtlı Şablon Yükle...</option>
            <option v-for="t in savedTemplates" :key="t.id" :value="t.id">{{t.name}}</option>
         </select>
         <button v-if="selectedTemplateId" class="secondary-btn small-btn danger-btn" @click="$emit('delete-template')" style="flex-shrink: 0;">Sil</button>
         <button v-if="savedTemplates.length > 0" class="secondary-btn small-btn danger-btn" @click="$emit('clear-templates')" style="flex-shrink: 0; margin-left: auto;">Tümünü Temizle</button>
      </div>

      <p class="settings-help" style="margin-top:-16px;">
        Her salon için sıra sayısı ve sütun sayısını belirleyin. Kapasite otomatik hesaplanır.
      </p>

      <div
        v-for="(salon, index) in settings.salons"
        :key="salon.id"
        class="room-card"
      >
        <label class="settings-field">
          <span>Salon adı</span>
          <input v-model="salon.name" type="text" @blur="$emit('sanitize-salon', index)" />
        </label>
        <div class="room-grid">
          <label class="settings-field">
            <span>Sıra</span>
            <input
              v-model.number="salon.rows"
              type="number"
              min="1"
              max="20"
              @change="$emit('sanitize-salon', index)"
              :class="{ 'input-error': salon.rows < 1 || salon.rows > 20 }"
            />
            <span v-if="salon.rows < 1 || salon.rows > 20" class="field-error">1 ile 20 arası değer girin</span>
          </label>
          <label class="settings-field">
            <span>Sütun</span>
            <input
              v-model.number="salon.columns"
              type="number"
              min="2"
              max="8"
              @change="$emit('sanitize-salon', index)"
              :class="{ 'input-error': salon.columns < 2 || salon.columns > 8 }"
            />
            <span v-if="salon.columns < 2 || salon.columns > 8" class="field-error">2 ile 8 arası değer girin</span>
          </label>
        </div>
        <div class="room-foot">
          <span>Kapasite: {{ salonCapacity(salon) }} öğrenci</span>
          <button class="secondary-btn small-btn danger-btn" @click="$emit('remove-salon', index)">
            Sil
          </button>
        </div>
      </div>
    </section>

    <section class="settings-group">
      <h4>Algoritma Kuralları</h4>
      <label class="toggle-field">
        <input v-model="settings.algorithm.avoidMixedGenderSideBySide" type="checkbox" />
        <span>Kız/Erkek yan yana gelmesini engelle</span>
      </label>
      <label class="toggle-field">
        <input v-model="settings.algorithm.avoidSameGradeSideBySide" type="checkbox" />
        <span>Aynı sınıfların yan yana gelmesini engelle</span>
      </label>
      <label class="toggle-field">
        <input v-model="settings.algorithm.avoidSameGradeBehind" type="checkbox" />
        <span>Aynı sınıfların arka arkaya gelmesini engelle</span>
      </label>
      <label class="toggle-field">
        <input v-model="settings.algorithm.avoidSameGradeDiagonally" type="checkbox" />
        <span>Aynı sınıfların çapraz gelmesini engelle</span>
      </label>
      <label class="toggle-field">
        <input v-model="settings.algorithm.enforceGrade8VerticalRule" type="checkbox" />
        <span>En üst sınıfların dikey ardışıklığını engelle</span>
      </label>
      <label class="toggle-field">
        <input v-model="settings.algorithm.avoidTopGradeDiagonally" type="checkbox" />
        <span>En üst sınıfların çapraz ardışıklığını engelle</span>
      </label>
      <label class="toggle-field">
        <input v-model="settings.algorithm.enforceInnerOuterRule" type="checkbox" />
        <span>En üst sınıfları duvar tarafına al</span>
      </label>

      <div class="constraint-section" style="margin-top: 16px;">
        <h5 style="margin: 0 0 8px 0; font-size: 0.9rem; color: var(--text-secondary);">Davranışsal Kısıtlamalar (Kara Liste)</h5>
        <textarea 
          v-model="settings.behavioralConstraints" 
          placeholder="Örn: Ali Veli, Ayşe Fatma (Her satıra bir ikili)"
          class="minimal-textarea"
          style="font-size: 0.85rem; height: 80px;"
        ></textarea>
        <p class="settings-help" style="margin-top: 4px;">Birbirinden uzak tutulması gereken öğrencileri virgülle ayırarak yazın.</p>
      </div>
    </section>
    
    <section class="settings-group">
      <h4>Veri Yönetimi</h4>
      <div class="data-actions" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
         <button class="secondary-btn small-btn" @click="$emit('export-json')" title="Tüm ayarlarınızı ve geçmişi JSON dosyası olarak indirin">Dışa Aktar (Yedekle)</button>
         <label class="secondary-btn small-btn file-upload-btn" style="margin: 0; display: inline-flex; justify-content: center; align-items: center; cursor: pointer;">
           İçe Aktar (Yükle)
           <input type="file" accept=".json" style="display: none;" @change="(e) => $emit('import-json', e)" />
         </label>
      </div>
      <p class="settings-help">Şablonlarınız, geçmiş oturumlarınız ve tüm fiziksel ayarlarınız tek bir dosyada saklanır.</p>
    </section>
  </aside>
</template>

<script setup lang="ts">
import CustomDatePicker from "@/components/CustomDatePicker.vue";

defineProps<{
  isOpen: boolean;
  settings: any;
  savedTemplates: any[];
  selectedTemplateId: string;
  salonCapacity: (salon: any) => number;
}>();

defineEmits([
  'update:isOpen',
  'update:selectedTemplateId',
  'add-salon',
  'save-template',
  'apply-template',
  'delete-template',
  'clear-templates',
  'sanitize-salon',
  'remove-salon',
  'export-json',
  'import-json'
]);
</script>

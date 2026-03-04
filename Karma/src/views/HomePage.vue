<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <div class="app-container" :class="{ 'dark-theme': isDarkMode }">
        <!-- Navbar -->
        <header class="header">
          <div class="header-content">
            <h1 class="logo">Karma</h1>
            <div class="header-actions">
              <button
                @click="toggleSettingsDrawer"
                class="theme-toggle"
                aria-label="Ayarları Aç"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="icon"
                >
                  <circle cx="12" cy="12" r="3"></circle>
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                  ></path>
                </svg>
              </button>
              <button
                @click="toggleTheme"
                class="theme-toggle"
                aria-label="Temayı Değiştir"
              >
                <!-- Moon Icon for Light Mode (switch to dark) -->
                <svg
                  v-if="!isDarkMode"
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="icon"
                >
                  <path
                    d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                  ></path>
                </svg>
                <!-- Sun Icon for Dark Mode (switch to light) -->
                <svg
                  v-else
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="icon"
                >
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              </button>
            </div>
          </div>
        </header>

        <!-- Main Workspace -->
        <main class="main-content">
          <div class="content-wrapper">
            <h2 class="title">Oturma Planı Oluşturucu</h2>
            <p class="description">
              Öğrenci listesini aşağıya yapıştırın. <br class="mobile-break" />
              Biçim: <code>[Ad Soyad] [Sınıf] [Cinsiyet]</code>
            </p>

            <div class="import-panel">
              <input
                ref="fileInputRef"
                class="hidden-input"
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                @change="handleFileSelection"
              />
              <div
                class="drop-zone"
                :class="{ active: isDragActive }"
                @click="openFilePicker"
                @dragover="handleDragOver"
                @dragleave="handleDragLeave"
                @drop="handleDrop"
              >
                <strong>Dosya Yükle</strong>
                <p>
                  .csv, .xlsx, .xls veya .txt dosyasını sürükleyip bırakın ya da
                  tıklayın.
                </p>
              </div>
              <p v-if="importMsg" class="import-feedback">{{ importMsg }}</p>
            </div>

            <div class="input-group">
              <textarea
                v-model="rawInput"
                placeholder="Örn. Mücahit Dursun 8 E"
                rows="10"
                class="minimal-textarea"
                spellcheck="false"
              ></textarea>
            </div>

            <transition name="slide-fade">
              <DashboardStats
                v-if="seatingStats"
                :stats="seatingStats"
                @download="downloadPlan"
              />
            </transition>

            <RoomVisualizer
              v-if="
                isPlanReady &&
                generatedSalons.length > 0 &&
                generatedSeats.length > 0
              "
              :salons="generatedSalons"
              :seats="generatedSeats"
              :rules="appSettings.algorithm"
              :isShuffling="isShuffling"
              @update:seats="generatedSeats = $event"
            />

            <div
              class="action-group"
              :class="{ 'sticky-actions': isPlanReady }"
            >
              <button
                v-if="!isPlanReady"
                @click="generatePlan"
                class="primary-btn"
                :disabled="isGenerating || !rawInput.trim()"
              >
                {{ isGenerating ? "Oluşturuluyor..." : "Oturma Planı Oluştur" }}
              </button>

              <div v-else class="button-row">
                <button @click="downloadPlan" class="primary-btn download-btn">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  <span class="btn-text">Planı İndir</span>
                </button>
                <button
                  @click="generatePlan"
                  class="secondary-btn"
                  :disabled="isGenerating"
                  title="Yeniden Oluştur"
                >
                  <svg
                    v-if="isGenerating"
                    class="spin"
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
                  </svg>
                  <svg
                    v-else
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M21.5 2v6h-6M2.13 15.57a10 10 0 1 0 .57-8.38" />
                  </svg>
                  <span class="btn-text">Yeniden Oluştur</span>
                </button>
                <button
                  @click="saveCurrentPlanToHistory"
                  class="secondary-btn"
                  title="Mevcut düzeni geçmişe kaydeder"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
                    ></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  <span class="btn-text">Kaydet</span>
                </button>
              </div>
            </div>

            <HistoryPanel
              :historyItems="historyItems"
              @clear-history="clearHistoryList"
              @download="downloadHistoryItem"
              @restore="restoreFromHistory"
            />
          </div>
        </main>

        <!-- Global Toast Notifications -->
        <transition name="toast">
          <div v-if="successMsg" class="toast-feedback success-feedback">
            <div>{{ successMsg }}</div>
          </div>
        </transition>

        <SettingsDrawer
          :isOpen="isSettingsOpen"
          :settings="appSettings"
          :savedTemplates="savedTemplates"
          :selectedTemplateId="selectedTemplateId"
          :salonCapacity="salonCapacity"
          @update:isOpen="isSettingsOpen = $event"
          @update:selectedTemplateId="selectedTemplateId = $event"
          @add-salon="addSalon"
          @save-template="handleSaveTemplate"
          @apply-template="applyTemplate"
          @delete-template="handleDeleteTemplate"
          @clear-templates="handleClearTemplates"
          @sanitize-salon="sanitizeSalonAt"
          @remove-salon="removeSalon"
          @export-json="exportDataJSON"
          @import-json="handleImportJSON"
        />

        <footer class="footer">
          Einherjar tarafından geliştirildi <span class="accent">•</span> 2026
        </footer>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { IonContent, IonPage } from "@ionic/vue";
import DashboardStats from "@/components/DashboardStats.vue";
import HistoryPanel from "@/components/HistoryPanel.vue";
import RoomVisualizer from "@/components/RoomVisualizer.vue";
import SettingsDrawer from "@/components/SettingsDrawer.vue";
import {
  parseStudentList,
  assignSeats,
  generateSeats,
} from "@/utils/seatingAlgorithm";
import type {
  Student,
  Seat,
  SalonLayout,
  StudentConstraint,
} from "@/utils/seatingAlgorithm";
import { generateSeatingPDF } from "@/utils/pdfGenerator";
import { loadAppSettings, saveAppSettings } from "@/utils/appSettings";
import { readStudentFile } from "@/utils/fileImport";
import {
  addHistoryEntry,
  clearHistory,
  loadDraftInput,
  loadHistory,
  saveDraftInput,
} from "@/utils/historyStorage";
import type { SeatingHistoryItem } from "@/utils/historyStorage";
import {
  loadTemplates,
  saveTemplate,
  deleteTemplate,
  clearAllTemplates,
} from "@/utils/templateStorage";
import type { SalonTemplate } from "@/utils/templateStorage";

const rawInput = ref("");
const isGenerating = ref(false);
const successMsg = ref("");
const warningMsg = ref("");
const isDarkMode = ref(false);
const isPlanReady = ref(false);
const isDragActive = ref(false);
const importMsg = ref("");
const fileInputRef = ref<HTMLInputElement | null>(null);
const historyItems = ref<SeatingHistoryItem[]>([]);
const isRestoringHistory = ref(false);
const isSettingsOpen = ref(false);
const appSettings = ref(loadAppSettings());
const isInternalSettingsUpdate = ref(false);

const savedTemplates = ref<SalonTemplate[]>(loadTemplates());
const selectedTemplateId = ref("");
const activeHistoryId = ref<string | null>(null);
const isShuffling = ref(false);

const generatedSeats = ref<Seat[]>([]);
const generatedUnassigned = ref<Student[]>([]);
const generatedQualityScore = ref<number>(100);
const generatedDeadlockResolved = ref<boolean>(false);
const generatedSalons = ref<SalonLayout[]>(
  appSettings.value.salons.map((salon: SalonLayout) => ({ ...salon })),
);

const minSalonRows = 1;
const maxSalonRows = 20;
const minSalonColumns = 2;
const maxSalonColumns = 8;

const seatingStats = computed(() => {
  if (!isPlanReady.value) return null;
  const totalStudents = parseStudentList(rawInput.value).length;
  const totalCapacity = generatedSalons.value.reduce(
    (acc, salon) => acc + salon.rows * salon.columns * 2,
    0,
  );
  const assignedCount = generatedSeats.value.filter((s) => s.student).length;
  const unassignedCount = generatedUnassigned.value.length;
  const occupancyRate =
    totalCapacity > 0 ? (assignedCount / totalCapacity) * 100 : 0;
  const emptySeats = totalCapacity - assignedCount;

  return {
    totalStudents,
    totalCapacity,
    assignedCount,
    unassignedCount,
    occupancyRate,
    emptySeats,
    isOverCapacity: unassignedCount > 0,
    qualityScore: generatedQualityScore.value,
    deadlockResolved: generatedDeadlockResolved.value,
  };
});

watch(rawInput, () => {
  saveDraftInput(rawInput.value);
  if (isRestoringHistory.value) return;
  isPlanReady.value = false;
  successMsg.value = "";
  warningMsg.value = "";
});

watch(
  appSettings,
  (nextSettings) => {
    saveAppSettings(nextSettings);
  },
  { deep: true },
);

// Note: Algorithm rule changes no longer reset the plan.
// The violation check automatically re-evaluates based on currently active rules.
// To regenerate the plan with new rules, click "Planı Yeniden Oluştur".

watch(
  () => appSettings.value.salons,
  () => {
    if (!isRestoringHistory.value && !isInternalSettingsUpdate.value) {
      isPlanReady.value = false;
    }
  },
  { deep: true },
);

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  localStorage.setItem("theme", isDarkMode.value ? "dark" : "light");
};

onMounted(() => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    isDarkMode.value = true;
  } else if (
    !savedTheme &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    isDarkMode.value = true;
  }

  rawInput.value = loadDraftInput();
  historyItems.value = loadHistory();
  appSettings.value.salons = normalizeSalons(appSettings.value.salons);
  generatedSalons.value = appSettings.value.salons.map((salon: SalonLayout) => ({
    ...salon,
  }));
});

const clampInteger = (
  value: number,
  min: number,
  max: number,
  fallback: number,
) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
};

const normalizeSalons = (salons: SalonLayout[]): SalonLayout[] => {
  const normalized = salons
    .map((salon, index) => {
      const fallbackId = index + 1;
      return {
        id: clampInteger(Number(salon.id), 1, 9999, fallbackId),
        name: (salon.name || "").trim() || `Salon ${fallbackId}`,
        rows: clampInteger(Number(salon.rows), minSalonRows, maxSalonRows, 4),
        columns: clampInteger(
          Number(salon.columns),
          minSalonColumns,
          maxSalonColumns,
          2,
        ),
      };
    })
    .filter((salon) => salon.rows > 0 && salon.columns > 0);

  if (normalized.length === 0) {
    return [{ id: 1, name: "Salon 1", rows: 4, columns: 2 }];
  }

  return normalized;
};

const parseConstraints = (text?: string): StudentConstraint[] => {
  const result: StudentConstraint[] = [];
  if (!text) return result;

  const lines = text.split("\n");
  for (const line of lines) {
    const parts = line
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    if (parts.length >= 2) {
      result.push({
        type: "avoidTogether",
        studentNames: parts,
      });
    }
  }
  return result;
};

const generatePlan = async () => {
  isGenerating.value = true;
  isShuffling.value = true;
  successMsg.value = "";
  warningMsg.value = "";

  try {
    const students = parseStudentList(rawInput.value);
    if (students.length === 0) {
      alert("Geçerli öğrenci bulunamadı. Formatı kontrol edin!");
      isGenerating.value = false;
      isShuffling.value = false;
      return;
    }

    const sanitizedSalons = normalizeSalons(appSettings.value.salons);

    // Animation logic
    const baseSeats = generateSeats(sanitizedSalons);
    const lockedSeatsMap = new Map<string, Seat>();
    generatedSeats.value
      .filter((s) => s.student && s.isLocked)
      .forEach((s) => {
        lockedSeatsMap.set(`${s.salon}-${s.column}-${s.row}-${s.side}`, s);
      });

    const shuffleSteps = 10;
    for (let i = 0; i < shuffleSteps; i++) {
      const tempStudents = [...students]
        .filter((st) => {
          for (const [key, seat] of lockedSeatsMap.entries()) {
            if (seat.student?.number === st.number) return false;
          }
          return true;
        })
        .sort(() => Math.random() - 0.5);

      let studentIndex = 0;
      const tempSeats = baseSeats.map((s) => {
        const key = `${s.salon}-${s.column}-${s.row}-${s.side}`;
        if (lockedSeatsMap.has(key)) {
          return {
            ...s,
            student: lockedSeatsMap.get(key)!.student,
            isLocked: true,
          };
        }
        return {
          ...s,
          student: tempStudents[studentIndex++] || null,
        };
      });
      generatedSeats.value = tempSeats;
      generatedSalons.value = sanitizedSalons.map((salon) => ({ ...salon }));
      isPlanReady.value = true;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    isInternalSettingsUpdate.value = true;
    appSettings.value.salons = sanitizedSalons;

    const constraints = parseConstraints(
      appSettings.value.behavioralConstraints,
    );

    const { seats, unassigned, qualityScore, deadlockResolved } = assignSeats(
      students,
      {
        rules: appSettings.value.algorithm,
        salons: sanitizedSalons,
        studentConstraints: constraints,
        lockedSeats: generatedSeats.value,
      },
    );

    generatedSeats.value = seats;
    generatedUnassigned.value = unassigned;
    generatedQualityScore.value = qualityScore;
    generatedDeadlockResolved.value = deadlockResolved;
    generatedSalons.value = sanitizedSalons.map((salon) => ({ ...salon }));
    activeHistoryId.value = null;
    isPlanReady.value = true;

    if (unassigned.length > 0) {
      warningMsg.value = unassigned.length.toString();
    } else {
      successMsg.value = "Oturma planı başarıyla oluşturuldu.";
      setTimeout(() => {
        successMsg.value = "";
      }, 5000);
    }

    setTimeout(() => {
      isInternalSettingsUpdate.value = false;
    }, 0);
  } catch (err: any) {
    alert("Plan oluşturulurken hata oluştu: " + err.message);
    isInternalSettingsUpdate.value = false;
  } finally {
    isGenerating.value = false;
    isShuffling.value = false;
  }
};

const downloadPlan = () => {
  generateSeatingPDF(
    generatedSeats.value,
    generatedUnassigned.value,
    appSettings.value.pdf,
    generatedSalons.value,
  );
};

const downloadHistoryItem = (item: SeatingHistoryItem) => {
  generateSeatingPDF(
    item.seats,
    item.unassigned,
    appSettings.value.pdf,
    item.salons || normalizeSalons(appSettings.value.salons),
  );
};

const saveCurrentPlanToHistory = () => {
  if (!isPlanReady.value) return;

  historyItems.value = addHistoryEntry(
    rawInput.value,
    JSON.parse(JSON.stringify(generatedSeats.value)),
    JSON.parse(JSON.stringify(generatedUnassigned.value)),
    JSON.parse(JSON.stringify(generatedSalons.value)),
    generatedQualityScore.value,
    generatedDeadlockResolved.value,
  );
  activeHistoryId.value = historyItems.value[0].id;

  successMsg.value = "Düzenlemeler geçmişe yeni bir oturum olarak kaydedildi.";
  setTimeout(() => {
    successMsg.value = "";
  }, 5000);
};

const toggleSettingsDrawer = () => {
  isSettingsOpen.value = !isSettingsOpen.value;
};

const salonCapacity = (salon: SalonLayout) => {
  return salon.rows * salon.columns * 2;
};

const addSalon = () => {
  const current = normalizeSalons(appSettings.value.salons);
  const nextId = current.reduce((max, salon) => Math.max(max, salon.id), 0) + 1;
  current.push({
    id: nextId,
    name: `Salon ${nextId}`,
    rows: 4,
    columns: 2,
  });
  appSettings.value.salons = current;
};

const removeSalon = (index: number) => {
  const current = normalizeSalons(appSettings.value.salons);
  if (current.length <= 1) {
    importMsg.value = "En az bir salon tanımlı olmalı.";
    return;
  }
  current.splice(index, 1);
  appSettings.value.salons = current;
};

const handleSaveTemplate = () => {
  const name = prompt(
    "Şablon adı girin:",
    `Şablon ${savedTemplates.value.length + 1}`,
  );
  if (!name) return;
  saveTemplate(name, appSettings.value.salons);
  savedTemplates.value = loadTemplates();
  selectedTemplateId.value = "";
  importMsg.value = "Yeni şablon kaydedildi.";
};

const applyTemplate = () => {
  if (!selectedTemplateId.value) return;
  const template = savedTemplates.value.find(
    (t) => t.id === selectedTemplateId.value,
  );
  if (!template) return;
  appSettings.value.salons = template.salons.map((s: SalonLayout) => ({ ...s }));
  importMsg.value = `${template.name} şablonu yüklendi.`;
};

const handleDeleteTemplate = () => {
  if (!selectedTemplateId.value) return;
  if (!confirm("Seçili şablonu silmek istediğinize emin misiniz?")) return;
  deleteTemplate(selectedTemplateId.value);
  savedTemplates.value = loadTemplates();
  selectedTemplateId.value = "";
  importMsg.value = "Şablon silindi.";
};

const handleClearTemplates = () => {
  if (savedTemplates.value.length === 0) return;
  if (
    !confirm(
      "Tüm kayıtlı şablonları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
    )
  )
    return;
  clearAllTemplates();
  savedTemplates.value = [];
  selectedTemplateId.value = "";
  importMsg.value = "Tüm şablonlar temizlendi.";
};

const sanitizeSalonAt = (index: number) => {
  const current = normalizeSalons(appSettings.value.salons);
  if (index < 0 || index >= current.length) return;
  appSettings.value.salons = current;
};

const openFilePicker = () => {
  fileInputRef.value?.click();
};

const importFromFile = async (file: File) => {
  try {
    const text = await readStudentFile(file);
    if (!text.trim()) {
      importMsg.value = "Dosyada geçerli öğrenci satırı bulunamadı.";
      return;
    }

    rawInput.value = text;
    importMsg.value = `${file.name} yüklendi. Liste güncellendi.`;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata";
    importMsg.value = `Dosya okunamadı: ${message}`;
  }
};

const handleFileSelection = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  await importFromFile(file);
  input.value = "";
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  isDragActive.value = true;
};

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault();
  isDragActive.value = false;
};

const handleDrop = async (event: DragEvent) => {
  event.preventDefault();
  isDragActive.value = false;

  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  await importFromFile(file);
};


const restoreFromHistory = (entry: SeatingHistoryItem) => {
  isRestoringHistory.value = true;
  activeHistoryId.value = entry.id;
  rawInput.value = entry.rawInput;
  generatedSeats.value = JSON.parse(JSON.stringify(entry.seats));
  generatedUnassigned.value = JSON.parse(JSON.stringify(entry.unassigned));
  generatedSalons.value = normalizeSalons(
    entry.salons ?? appSettings.value.salons,
  );
  generatedQualityScore.value = entry.qualityScore ?? 100;
  generatedDeadlockResolved.value = entry.deadlockResolved ?? false;
  isPlanReady.value = true;

  successMsg.value =
    entry.unassigned.length === 0 ? "Geçmiş plan yüklendi." : "";
  warningMsg.value =
    entry.unassigned.length > 0 ? entry.unassigned.length.toString() : "";
  importMsg.value = "Geçmiş oturum geri yüklendi.";

  setTimeout(() => {
    isRestoringHistory.value = false;
  }, 0);
};

const clearHistoryList = () => {
  clearHistory();
  historyItems.value = [];
  importMsg.value = "Geçmiş temizlendi.";
};

// Data Import & Export Logic
const exportDataJSON = () => {
  const backupData = {
    appSettings: appSettings.value,
    historyItems: historyItems.value,
    savedTemplates: savedTemplates.value,
    rawInput: rawInput.value,
  };

  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(backupData, null, 2));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute(
    "download",
    `Karma_Yedek_${new Date().toISOString().split("T")[0]}.json`,
  );
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();

  successMsg.value = "Tüm verileriniz başarıyla indirildi.";
  setTimeout(() => {
    successMsg.value = "";
  }, 5000);
};

const handleImportJSON = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const contents = e.target?.result as string;
      const backupData = JSON.parse(contents);

      if (backupData.appSettings) {
        isInternalSettingsUpdate.value = true;
        appSettings.value = backupData.appSettings;
      }
      if (backupData.historyItems) {
        historyItems.value = backupData.historyItems;
        // re-save to localstorage manually
        localStorage.setItem(
          "seatingHistory",
          JSON.stringify(backupData.historyItems),
        );
      }
      if (backupData.savedTemplates) {
        savedTemplates.value = backupData.savedTemplates;
        localStorage.setItem(
          "salonTemplates",
          JSON.stringify(backupData.savedTemplates),
        );
      }
      if (backupData.rawInput) {
        rawInput.value = backupData.rawInput;
        saveDraftInput(backupData.rawInput);
      }

      successMsg.value = "Veriler başarıyla içe aktarıldı!";
      setTimeout(() => {
        successMsg.value = "";
      }, 5000);
      isPlanReady.value = false;

      // Clear input
      target.value = "";

      setTimeout(() => {
        isInternalSettingsUpdate.value = false;
      }, 0);
    } catch (err) {
      alert("Yedek dosyası okunurken hata oluştu. Geçersiz JSON formatı.");
    }
  };
  reader.readAsText(file);
};
</script>

<style src="./HomePage.css"></style>

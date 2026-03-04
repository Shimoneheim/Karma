<template>
  <div class="visualizer-container">
    <div class="visualizer-header">
      <h3>Kroki Önizleme</h3>
      <p class="subtitle">Sınıf yerleşimini inceleyin. Öğrencileri sürükleyip bırakarak yerlerini değiştirebilirsiniz.</p>
    </div>

    <!-- Kural Uyarıları -->
    <div v-if="localViolations.length > 0" class="violations-box">
      <h4><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-alert"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Kural İhlalleri Tespit Edildi</h4>
      <ul>
        <li v-for="(v, i) in localViolations" :key="i">
          Salon {{ v.salonName }}: {{ v.message }}
        </li>
      </ul>
    </div>

    <!-- Salon Seçici -->
    <div class="salon-tabs">
      <button 
        v-for="salon in salons" 
        :key="salon.id"
        class="salon-tab"
        :class="{ active: activeSalonId === salon.id }"
        @click="activeSalonId = salon.id"
      >
        {{ salon.name }}
      </button>
    </div>

    <!-- Aktif Salon Kroki -->
    <div v-if="activeSalon" class="room-canvas">
      <!-- Öğretmen Masası / Tahta -->
      <div class="board-area">
        <span>Yazı Tahtası</span>
      </div>

      <!-- Sütunlar Container -->
      <div 
        class="columns-container" 
        :style="{ gridTemplateColumns: `repeat(${activeSalon.columns}, 1fr)` }"
      >
        <!-- Sütun Döngüsü -->
        <div 
          v-for="c in activeSalon.columns" 
          :key="c" 
          class="desk-column"
        >
          <!-- Sıra Döngüsü (Önden arkaya) -->
          <div 
            v-for="r in activeSalon.rows" 
            :key="r"
            class="desk"
          >
            <!-- Koltuklar (Sol / Sağ) -->
            <div 
              class="seat left-seat" 
              :class="getSeatClasses(getSeat(activeSalon.id, c-1, r-1, 'left'))"
              draggable="true"
              @dragstart="onDragStart($event, getSeat(activeSalon.id, c-1, r-1, 'left'))"
              @dragover.prevent
              @drop="onDrop($event, getSeat(activeSalon.id, c-1, r-1, 'left'))"
            >
              <button 
                v-if="getSeat(activeSalon.id, c-1, r-1, 'left')?.student && !isShuffling"
                class="lock-btn" 
                :class="{ 'is-locked': getSeat(activeSalon.id, c-1, r-1, 'left')?.isLocked }"
                @click.stop="toggleLock(getSeat(activeSalon.id, c-1, r-1, 'left'))"
                title="Öğrenciyi Kilitle/Aç"
              >
                <svg v-if="getSeat(activeSalon.id, c-1, r-1, 'left')?.isLocked" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lock-icon locked"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lock-icon unlocked"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
              </button>

              <div class="seat-content">
                <span class="seat-index">{{ getSeatIndex(c-1, r-1, 'left') }}</span>
                <template v-if="getSeat(activeSalon.id, c-1, r-1, 'left')?.student">
                  <span class="seat-number">{{ getSeat(activeSalon.id, c-1, r-1, 'left')?.student?.number }}</span>
                  <span class="seat-name">
                    {{ getSeat(activeSalon.id, c-1, r-1, 'left')?.student?.name }}
                    <span class="seat-meta">
                      <strong class="grade-badge" v-if="getSeat(activeSalon.id, c-1, r-1, 'left')?.student?.grade">{{ getSeat(activeSalon.id, c-1, r-1, 'left')?.student?.grade }}</strong>
                      <strong class="gender-badge" v-if="getSeat(activeSalon.id, c-1, r-1, 'left')?.student?.gender">({{ getSeat(activeSalon.id, c-1, r-1, 'left')?.student?.gender }})</strong>
                    </span>
                  </span>
                </template>
                <span v-else class="seat-empty">Boş</span>
              </div>
            </div>

            <div 
              class="seat right-seat"
              :class="getSeatClasses(getSeat(activeSalon.id, c-1, r-1, 'right'))"
              draggable="true"
              @dragstart="onDragStart($event, getSeat(activeSalon.id, c-1, r-1, 'right'))"
              @dragover.prevent
              @drop="onDrop($event, getSeat(activeSalon.id, c-1, r-1, 'right'))"
            >
              <button 
                v-if="getSeat(activeSalon.id, c-1, r-1, 'right')?.student && !isShuffling"
                class="lock-btn" 
                :class="{ 'is-locked': getSeat(activeSalon.id, c-1, r-1, 'right')?.isLocked }"
                @click.stop="toggleLock(getSeat(activeSalon.id, c-1, r-1, 'right'))"
                title="Öğrenciyi Kilitle/Aç"
              >
                <svg v-if="getSeat(activeSalon.id, c-1, r-1, 'right')?.isLocked" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lock-icon locked"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lock-icon unlocked"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
              </button>

              <div class="seat-content">
                <span class="seat-index">{{ getSeatIndex(c-1, r-1, 'right') }}</span>
                <template v-if="getSeat(activeSalon.id, c-1, r-1, 'right')?.student">
                  <span class="seat-number">{{ getSeat(activeSalon.id, c-1, r-1, 'right')?.student?.number }}</span>
                  <span class="seat-name">
                    {{ getSeat(activeSalon.id, c-1, r-1, 'right')?.student?.name }}
                    <span class="seat-meta">
                      <strong class="grade-badge" v-if="getSeat(activeSalon.id, c-1, r-1, 'right')?.student?.grade">{{ getSeat(activeSalon.id, c-1, r-1, 'right')?.student?.grade }}</strong>
                      <strong class="gender-badge" v-if="getSeat(activeSalon.id, c-1, r-1, 'right')?.student?.gender">({{ getSeat(activeSalon.id, c-1, r-1, 'right')?.student?.gender }})</strong>
                    </span>
                  </span>
                </template>
                <span v-else class="seat-empty">Boş</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { Seat, SalonLayout, AssignmentRules } from '@/utils/seatingAlgorithm';
import { checkViolations } from '../utils/validationRules';
import type { Violation } from '../utils/validationRules';

const props = defineProps<{
  salons: SalonLayout[];
  seats: Seat[];
  rules: AssignmentRules;
  isShuffling?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:seats', newSeats: Seat[]): void;
}>();

const localSeats = ref<Seat[]>([]);
const activeSalonId = ref<number | null>(null);

// Sync prop exactly
watch(() => props.seats, (newSeats) => {
  localSeats.value = JSON.parse(JSON.stringify(newSeats));
}, { immediate: true, deep: true });

watch(() => props.salons, (newSalons) => {
  if (newSalons.length > 0 && !newSalons.find(s => s.id === activeSalonId.value)) {
    activeSalonId.value = newSalons[0].id;
  }
}, { immediate: true });

const activeSalon = computed(() => {
  return props.salons.find(s => s.id === activeSalonId.value) || null;
});

const getSeat = (salonId: number, col: number, row: number, side: 'left'|'right'): Seat | undefined => {
  return localSeats.value.find(s => s.salon === salonId && s.column === col && s.row === row && s.side === side);
};

const localViolations = computed(() => {
  if (props.isShuffling) return [];
  return checkViolations(localSeats.value, props.salons, props.rules);
});

// Calculate sequential seat index (1 to N)
// columns are left to right, rows are front to back, each desk has side='left' then side='right'
const getSeatIndex = (col: number, row: number, side: 'left' | 'right') => {
  if (!activeSalon.value) return 0;
  const seatsPerRow = activeSalon.value.columns * 2;
  const base = row * seatsPerRow;
  const colOffset = col * 2;
  const sideOffset = side === 'left' ? 1 : 2;
  return base + colOffset + sideOffset;
};

const getSeatClasses = (seat?: Seat) => {
  if (!seat) return [];
  const classes = [];
  if (seat.isOuter) classes.push('is-outer-seat');
  if (seat.student) {
    classes.push(`grade-${seat.student.grade}`);
  }
  
  // Is this seat violating any rules?
  const isViolating = localViolations.value.some((v: Violation) => v.seatRef === seat);
  if (isViolating) {
    classes.push('seat-violation');
  }
  if (props.isShuffling) {
    classes.push('shuffling');
  }

  return classes;
};

// --- DRAG AND DROP ---
let draggedSeat: Seat | null = null;

const onDragStart = (e: DragEvent, seat?: Seat) => {
  if (!seat) return;
  draggedSeat = seat;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', seat.student ? seat.student.number : 'empty');
  }
};

const onDrop = (e: DragEvent, targetSeat?: Seat) => {
  if (!targetSeat || !draggedSeat || targetSeat === draggedSeat) return;
  
  // Swap exactly
  const tempStudent = targetSeat.student;
  targetSeat.student = draggedSeat.student;
  draggedSeat.student = tempStudent;
  
  // Reactively trigger violations and emit
  emit('update:seats', localSeats.value);
};

const toggleLock = (seat?: Seat) => {
  if (!seat || !seat.student) return;
  seat.isLocked = !seat.isLocked;
  emit('update:seats', localSeats.value);
};

</script>

<style scoped>
.visualizer-container {
  margin-top: 2rem;
  padding: 1rem 0;
  border-top: 1px solid var(--border-color);
  animation: fadeIn 0.5s ease;
}

.visualizer-header h3 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
  letter-spacing: -0.02em;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin-bottom: 24px;
}

.violations-box {
  background-color: var(--error-bg);
  border: 1px solid var(--error-border);
  color: var(--error-text);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.violations-box h4 {
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
}

.violations-box ul {
  margin: 0;
  padding-left: 20px;
  font-size: 0.9rem;
}
.violations-box li {
  margin-bottom: 4px;
}

.salon-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 20px;
  padding-bottom: 8px;
}

.salon-tab {
  padding: 8px 16px;
  background: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.salon-tab.active {
  background: var(--input-focus);
  border-color: var(--input-focus);
  color: #fff;
}

.room-canvas {
  background: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  overflow-x: auto;
}

.board-area {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

.board-area span {
  background: var(--border-color);
  padding: 8px 60px;
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.columns-container {
  display: grid;
  gap: 80px; /* Spacious corridor on desktop */
  justify-content: center;
}

.desk-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.desk {
  display: flex;
  gap: 4px;
  background: rgba(0,0,0,0.02);
  padding: 6px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.dark-theme .desk {
  background: rgba(255,255,255,0.02);
}

.seat {
  flex: 1;
  min-width: 60px;
  height: 90px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: grab;
  position: relative;
  transition: all 0.2s ease;
}

.seat:active {
  cursor: grabbing;
}

.seat:hover {
  border-color: var(--text-secondary);
}

.lock-btn {
  position: absolute;
  top: -8px;
  left: -8px;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  opacity: 0;
  transition: all 0.2s ease;
  z-index: 2;
}

.seat:hover .lock-btn,
.lock-btn.is-locked {
  opacity: 1;
}

.lock-btn.is-locked {
  color: var(--input-focus);
  border-color: var(--input-focus);
  background: var(--bg-color);
}

.seat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 4px;
  text-align: center;
}

.seat-index {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 0.65rem;
  font-weight: 800;
  background: var(--border-color);
  color: var(--text-secondary);
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  opacity: 0.8;
}

.seat-number {
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 2px;
  color: var(--text-primary);
}

.seat-name {
  font-size: 0.7rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  color: var(--text-secondary);
}

.seat-empty {
  color: var(--text-secondary);
  opacity: 0.5;
  font-size: 0.85rem;
}

.seat-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 2px;
}

.grade-badge {
  background: var(--input-focus);
  color: white;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 0.65rem;
  line-height: 1.4;
  font-weight: 700;
}

.gender-badge {
  opacity: 0.7;
  font-size: 0.65rem;
}

/* Violation styles */
.seat-violation {
  border: 2px dashed var(--error-text);
  background-color: var(--error-bg);
}

.seat-violation .seat-number {
  color: var(--error-text);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shufflePulse {
  0% { transform: scale(1); filter: blur(0px); }
  50% { transform: scale(1.02); filter: blur(1px); }
  100% { transform: scale(1); filter: blur(0px); }
}

.shuffling {
  animation: shufflePulse 0.2s ease-in-out infinite;
  border-color: var(--input-focus) !important;
  pointer-events: none;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .visualizer-header h3 {
    font-size: 1.25rem;
  }
  
  .subtitle {
    font-size: 0.85rem;
    margin-bottom: 16px;
  }

  .room-canvas {
    padding: 12px;
    border-radius: 8px;
  }

  .board-area {
    margin-bottom: 20px;
  }

  .board-area span {
    padding: 6px 30px;
    font-size: 0.75rem;
  }

  .columns-container {
    gap: 48px; /* Very clear corridor for tablets */
  }

  .desk {
    padding: 4px;
    gap: 2px;
  }

  .seat {
    height: 64px;
    min-width: 44px;
    border-radius: 4px;
  }

  .seat-number {
    font-size: 0.9rem;
  }

  .seat-name {
    font-size: 0.6rem;
  }

  .seat-grade {
    width: 15px;
    height: 15px;
    font-size: 0.6rem;
    top: 2px;
    right: 2px;
  }

  .seat-empty {
    font-size: 0.75rem;
  }

  .salon-tab {
    padding: 6px 12px;
    font-size: 0.85rem;
  }
}

/* Extra small devices */
@media (max-width: 480px) {
  .visualizer-container {
    margin-top: 1rem;
    padding: 0.5rem 0;
  }

  .columns-container {
    gap: 32px; /* Broad corridors even on mobile */
  }

  .seat {
    height: 54px;
    min-width: 36px; /* Slightly narrower to accommodate wider corridors */
  }

  .seat-name {
    display: none; /* Hide names on very small screens to avoid clutter */
  }
  
  .seat-number {
    font-size: 0.85rem;
    margin-bottom: 0;
  }
}

/* Scrollbar for canvas */
.room-canvas::-webkit-scrollbar {
  height: 8px;
}
.room-canvas::-webkit-scrollbar-track {
  background: var(--bg-color);
}
.room-canvas::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}
</style>

<template>
  <div class="custom-datepicker" ref="containerRef">
    <div class="datepicker-trigger" @click="togglePicker">
      <span class="date-display">{{ formattedDate || "Tarih Seçin" }}</span>
      <svg
        class="calendar-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    </div>

    <Transition name="picker-fade">
      <div v-if="isOpen" class="datepicker-popover">
        <div class="picker-header">
          <button 
            class="nav-btn" 
            @click.stop="prevMonth"
            :disabled="isPrevMonthDisabled"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <div class="current-month">
            {{ monthNames[viewDate.getMonth()] }} {{ viewDate.getFullYear() }}
          </div>
          <button 
            class="nav-btn" 
            @click.stop="nextMonth"
            :disabled="isNextMonthDisabled"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        <div class="days-grid">
          <div v-for="day in weekDays" :key="day" class="weekday-label">{{ day }}</div>
          <div
            v-for="(date, idx) in calendarDays"
            :key="idx"
            class="day-cell"
            :class="{
              'other-month': date.getMonth() !== viewDate.getMonth(),
              'is-today': isToday(date),
              'is-selected': isSelected(date),
              'is-disabled': !isDateInRange(date)
            }"
            @click.stop="isDateInRange(date) ? selectDate(date) : null"
          >
            {{ date.getDate() }}
          </div>
        </div>

        <div class="picker-footer">
          <button 
            class="text-btn" 
            @click.stop="setToday"
            :disabled="!isDateInRange(new Date())"
          >Bugün</button>
          <button class="text-btn clear" @click.stop="clearDate">Temizle</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
  modelValue: string; // YYYY-MM-DD
}>();

const emit = defineEmits(['update:modelValue']);

const isOpen = ref(false);
const containerRef = ref<HTMLElement | null>(null);

// Date logic
const MIN_YEAR = 2026;
const MAX_YEAR = 2100;

const viewDate = ref(new Date());
const weekDays = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
const monthNames = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const getLocalDate = (val: string) => {
  if (!val) return new Date();
  const parts = val.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  const fallback = new Date(val);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

const formattedDate = computed(() => {
  if (!props.modelValue) return '';
  const date = getLocalDate(props.modelValue);
  return `${date.getDate().toString().padStart(2, '0')} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
});

watch(() => props.modelValue, (newVal) => {
  if (newVal && !isOpen.value) {
    const current = getLocalDate(newVal);
    if (current.getFullYear() >= MIN_YEAR && current.getFullYear() <= MAX_YEAR) {
      viewDate.value = new Date(current.getFullYear(), current.getMonth(), 1);
    }
  }
}, { immediate: true });

const togglePicker = () => {
  if (!isOpen.value) {
    // Reset view date to selected date or today
    let current = props.modelValue ? getLocalDate(props.modelValue) : new Date();
    
    // Ensure initial view is within range
    if (current.getFullYear() < MIN_YEAR) {
      current = new Date(MIN_YEAR, 0, 1);
    } else if (current.getFullYear() > MAX_YEAR) {
      current = new Date(MAX_YEAR, 11, 31);
    }
    
    viewDate.value = new Date(current.getFullYear(), current.getMonth(), 1);
  }
  isOpen.value = !isOpen.value;
};

const calendarDays = computed(() => {
  const year = viewDate.value.getFullYear();
  const month = viewDate.value.getMonth();
  
  // First day of the month
  const firstDay = new Date(year, month, 1);
  // Last day of the previous month
  // Adjustment for Monday start (Pt = 0...Pz = 6)
  let startDayOffset = firstDay.getDay() - 1;
  if (startDayOffset < 0) startDayOffset = 6;

  const days = [];
  const startAt = new Date(year, month, 1 - startDayOffset);

  // Show 6 weeks fixed grid (42 cells)
  for (let i = 0; i < 42; i++) {
    const d = new Date(startAt);
    d.setDate(startAt.getDate() + i);
    days.push(d);
  }
  return days;
});

const selectDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  emit('update:modelValue', `${yyyy}-${mm}-${dd}`);
  isOpen.value = false;
};

const prevMonth = () => {
  if (isPrevMonthDisabled.value) return;
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1);
};

const nextMonth = () => {
  if (isNextMonthDisabled.value) return;
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1);
};

const isPrevMonthDisabled = computed(() => {
  const year = viewDate.value.getFullYear();
  const month = viewDate.value.getMonth();
  return year <= MIN_YEAR && month <= 0;
});

const isNextMonthDisabled = computed(() => {
  const year = viewDate.value.getFullYear();
  const month = viewDate.value.getMonth();
  return year >= MAX_YEAR && month >= 11;
});

const isDateInRange = (date: Date) => {
  const y = date.getFullYear();
  return y >= MIN_YEAR && y <= MAX_YEAR;
};

const setToday = () => {
  const today = new Date();
  if (isDateInRange(today)) {
    selectDate(today);
  }
};

const clearDate = () => {
  emit('update:modelValue', '');
  isOpen.value = false;
};

const isToday = (date: Date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

const isSelected = (date: Date) => {
  if (!props.modelValue) return false;
  const sel = getLocalDate(props.modelValue);
  return date.getDate() === sel.getDate() &&
         date.getMonth() === sel.getMonth() &&
         date.getFullYear() === sel.getFullYear();
};

// Outside click handler
const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>

<style scoped>
.custom-datepicker {
  position: relative;
  width: 100%;
}

.datepicker-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.datepicker-trigger:hover {
  border-color: var(--input-focus);
}

.date-display {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.calendar-icon {
  width: 18px;
  height: 18px;
  color: var(--text-secondary);
}

.datepicker-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 280px;
  background: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  padding: 12px;
  user-select: none;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.current-month {
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: -0.02em;
}

.nav-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background: var(--border-color);
  color: var(--text-primary);
}

.nav-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.weekday-label {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  padding: 4px 0;
  opacity: 0.6;
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.day-cell:hover {
  background: var(--border-color);
}

.day-cell.other-month {
  opacity: 0.25;
}

.day-cell.is-disabled {
  opacity: 0.1 !important;
  cursor: not-allowed;
  pointer-events: none;
}

.day-cell.is-today {
  color: var(--input-focus);
  font-weight: 800;
  background: var(--input-shadow);
}

.day-cell.is-selected {
  background: var(--input-focus) !important;
  color: #ffffff !important;
  font-weight: 700;
}

.picker-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.text-btn {
  background: transparent;
  border: none;
  color: var(--input-focus);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.text-btn:hover:not(:disabled) {
  background: var(--input-shadow);
}

.text-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.text-btn.clear {
  color: var(--error-text);
}

.text-btn.clear:hover {
  background: var(--error-bg);
}

/* Animations */
.picker-fade-enter-active,
.picker-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.picker-fade-enter-from,
.picker-fade-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}

@media (max-width: 400px) {
  .datepicker-popover {
    width: calc(100vw - 36px);
    position: fixed;
    top: 50%;
    left: 18px;
    transform: translateY(-50%);
  }
}
</style>

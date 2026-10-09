<template>
  <font-awesome-icon v-if="faIcon" :icon="faIcon" class="size-[1em] shrink-0" />
  <span v-else aria-hidden="true">•</span>
</template>

<script>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
  faUpload, faBinoculars, faUsers, faExclamation, faCheck, faCircle,
  faBasketball, faTrophy, faGear, faList, faMagnifyingGlass, faFileCsv, faCloudArrowUp, faChartColumn, faCaretDown,
  faSun, faMoon, faDesktop
} from '@fortawesome/free-solid-svg-icons';

const icons = {
  upload: faUpload,
  binoculars: faBinoculars,
  users: faUsers,
  exclamation: faExclamation,
  check: faCheck,
  basketball: faBasketball,
  trophy: faTrophy,
  gear: faGear,
  list: faList,
  search: faMagnifyingGlass,
  csv: faFileCsv,
  cloud: faCloudArrowUp,
  chart: faChartColumn,
  'caret-down': faCaretDown,
  sun: faSun,
  moon: faMoon,
  desktop: faDesktop
};

export default {
  name: 'Icon',
  components: { FontAwesomeIcon },
  props: {
    name: { type: String, required: true }
  },
  computed: {
    faIcon() {
      return icons[this.name] || faCircle;
    }
  }
}
</script>

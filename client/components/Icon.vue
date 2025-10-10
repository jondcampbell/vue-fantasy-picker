<template>
  <font-awesome-icon v-if="faIcon" :icon="faIcon" :title="name" />
  <span v-else aria-hidden="true">•</span>
</template>

<script>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faUpload, faBinoculars, faUsers, faExclamation, faCheck, faCircle } from '@fortawesome/free-solid-svg-icons';

export default {
  name: 'Icon',
  components: { FontAwesomeIcon },
  props: {
    name: { type: String, required: true }
  },
  computed: {
    faIcon() {
      switch (this.name) {
        case 'upload': return faUpload;
        case 'binoculars': return faBinoculars;
        case 'users': return faUsers;
        case 'exclamation': return faExclamation;
        case 'check': return faCheck;
        default: return faCircle;
      }
    }
  }
}
</script>

<style scoped>
:deep(svg) {
  width: 1em;
  height: 1em;
}
</style>

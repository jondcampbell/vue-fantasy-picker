<template>
  <div class="page">
	<counter></counter>
	<import-data></import-data>
  </div>
</template>

<script>
import Counter from 'components/Counter';
import ImportData from 'components/ImportData';

export default {
  components: {
	Counter,
    ImportData
  }
}
</script>

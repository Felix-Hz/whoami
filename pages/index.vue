<template>
  <div>
    <SharedThePreloader
      :class="loaded ? 'hidden' : ''"
      @loading-is-over="loadingIsOver"
      ref="preloader"
    />

    <template v-if="loaded">
      <SharedTheHeader @headerHeightChanged="updateHeaderHeight" />
      <section class="custom-dot-background m-4 p-1" ref="loadedPage">
        <HomeAbout :headerHeight="headerHeight" />
        <HomeProjects />
        <HomeContact />
      </section>
    </template>
  </div>
</template>

<script>
import { gsap } from "gsap";

export default {
  data() {
    return {
      headerHeight: 0,
      loaded: false,
    };
  },
  methods: {
    updateHeaderHeight(height) {
      this.headerHeight = height;
    },
    loadingIsOver() {
      this.loaded = true;
      this.$nextTick(() => {
        this.animatePageTransition();
      });
    },
    animatePageTransition() {
      const loadedPage = this.$refs.loadedPage;
      const windowHeight = window.innerHeight;

      gsap.fromTo(
        loadedPage,
        {
          y: windowHeight,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 1,
        }
      );
    },
  },
};
</script>

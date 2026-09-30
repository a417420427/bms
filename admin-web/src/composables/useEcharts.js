import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as echarts from "echarts";

/**
 * ECharts 组合式封装：自动初始化、随容器缩放、卸载销毁
 * @param {import('vue').Ref} optionRef 图表配置
 */
export function useEcharts(optionRef) {
  const el = ref(null);
  let chart = null;

  function render() {
    if (chart && optionRef.value) {
      chart.setOption(optionRef.value, true);
    }
  }

  function resize() {
    chart?.resize();
  }

  onMounted(() => {
    if (el.value) {
      chart = echarts.init(el.value);
      render();
      window.addEventListener("resize", resize);
    }
  });

  watch(optionRef, render, { deep: true });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", resize);
    chart?.dispose();
    chart = null;
  });

  return { el };
}

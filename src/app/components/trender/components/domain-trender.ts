import { EChartOption, ECharts, EChartTitleOption, init } from "echarts"
import { ElCard } from "element-plus"
import { computed, defineComponent, h, onMounted, ref, Ref, SetupContext, watch } from "vue"
import { t } from "../../../../common/vue-i18n"
import timerDatabase, { SortDirect } from "../../../../database/timer-database"
import { formatPeriodCommon, formatTime, MILL_PER_DAY } from "../../../../util/time"

// Get the timestamp of one timestamp of date
const timestampOf = (d: Date) => d.getTime()

const mill2Second = (mill: number) => Math.floor((mill || 0) / 1000)

const chartRef: Ref<HTMLDivElement> = ref()
let chartInstance: ECharts
const formatTimeOfEchart = (params: EChartOption.Tooltip.Format | EChartOption.Tooltip.Format[]) => {
    const format: EChartOption.Tooltip.Format = params instanceof Array ? params[0] : params
    const { seriesName, name, value } = format
    return `${seriesName}<br/>${name}&ensp;-&ensp;${formatPeriodCommon((value instanceof Number ? value as number : 0) * 1000)}`
}

const options: EChartOption<EChartOption.SeriesLine> = {
    backgroundColor: 'rgba(0,0,0,0)',
    grid: { top: '100' },
    title: {
        text: t('trender.history.title'),
        subtext: '',
        left: 'center'
    },
    tooltip: {
        trigger: 'item'
    },
    toolbox: {
        feature: {
            saveAsImage: {
                show: true,
                title: t('popup.saveAsImageTitle'),
                excludeComponents: ['toolbox'],
                pixelRatio: 2,
                backgroundColor: '#fff'
            }
        }
    },
    xAxis: {
        type: 'category',
        data: []
    },
    yAxis: [
        { name: t('trender.history.timeUnit'), type: 'value' },
        { name: t('trender.history.numberUnit'), type: 'value' }
    ],
    legend: {
        left: 'left',
        data: [t('item.total'), t('item.focus'), t('item.time')]
    },
    series: [
        // run time
        {
            name: t('item.total'),
            data: [],
            yAxisIndex: 0,
            type: 'line',
            smooth: true,
            tooltip: { formatter: formatTimeOfEchart }
        },
        {
            name: t('item.focus'),
            data: [],
            yAxisIndex: 0,
            type: 'line',
            smooth: true,
            tooltip: { formatter: formatTimeOfEchart }
        },
        {
            name: t('item.time'),
            data: [],
            yAxisIndex: 1,
            type: 'line',
            smooth: true,
            tooltip: {
                formatter: (params: EChartOption.Tooltip.Format | EChartOption.Tooltip.Format[]) => {
                    const format: EChartOption.Tooltip.Format = params instanceof Array ? params[0] : params
                    const { seriesName, name, value } = format
                    return `${seriesName}<br/>${name}&emsp;-&emsp;${value}`
                }
            }
        }
    ]
}

const renderChart = () => chartInstance && chartInstance.setOption(options, true)

const domainRef: Ref<string> = ref('')
const dateRangeRef: Ref<Array<Date>> = ref([])

/**
* Get the x-axis of date 
*/
const getAxias = (format: string) => {
    const dateRange = dateRangeRef.value
    if (!dateRange || !dateRange.length) {
        // @since 0.0.9
        // The dateRange is cleared, return empty data
        return []
    }
    const xAxisData = []
    const startTime = timestampOf(dateRange[0])
    const endTime = timestampOf(dateRange[1])
    for (let time = startTime; time <= endTime; time += MILL_PER_DAY) {
        xAxisData.push(formatTime(time, format))
    }
    return xAxisData
}

/**
 * Update the x-axis
 */
const updateXAxis = () => {
    const xAxis: EChartOption.XAxis = options.xAxis as EChartOption.XAxis
    if (!domainRef.value || domainRef.value.length !== 2) {
        xAxis.data = []
    }
    xAxis.data = getAxias('{m}/{d}')
}

const queryParam = computed(() => {
    return {
        host: domainRef.value,
        fullHost: true,
        sort: 'date',
        sortOrder: SortDirect.ASC
    }
})

const queryData = () => {
    if (domainRef.value === '') {
        // Do nothing
        return
    }
    timerDatabase.select(rows => {
        const dateInfoMap = {}
        rows.forEach(row => dateInfoMap[row.date] = row)
        const allXAxis = getAxias('{y}{m}{d}')

        const focusData = []
        const totalData = []
        const timeData = []

        allXAxis.forEach(date => {
            const row = dateInfoMap[date] || {}
            focusData.push(mill2Second(row.focus))
            totalData.push(mill2Second(row.total))
            timeData.push(row.time || 0)
        })

        const titleOption = options.title as EChartTitleOption
        titleOption.subtext = domainRef.value
        options.series[0].data = totalData
        options.series[1].data = focusData
        options.series[2].data = timeData
        renderChart()
    }, queryParam.value)
}

const _default = defineComponent((_, context: SetupContext) => {
    context.expose({
        setDomain: (domain: string) => domainRef.value = domain,
        setDateRange: (dateRange: Date[]) => dateRangeRef.value = dateRange
    })

    onMounted(() => {
        chartInstance = init(chartRef.value)
        updateXAxis()
        renderChart()
    })

    watch(domainRef, queryData)
    watch(dateRangeRef, () => {
        updateXAxis()
        queryData()
    })

    return () => h(ElCard, { style: 'margin-top: 25px;' }, () => h('div', { style: 'width:100%;height:600px;', ref: chartRef }))
})

export default _default
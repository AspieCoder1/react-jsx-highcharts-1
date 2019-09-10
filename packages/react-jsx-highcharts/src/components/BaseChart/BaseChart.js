import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import debounce from '../../utils/debounce-raf';
import { isEqual, attempt } from 'lodash-es'
import { Provider } from '../ChartContext';
import { validChartTypes } from '../../utils/propTypeValidators'
import clean from '../../utils/removeProvidedProps';
import useDelay from '../UseDelay';
import usePrevious from '../UsePrevious';

const BaseChart = ({ children = null, callback, className = '', ...restProps}) => {

  const [rendered, setRendered] = useState(false);
  const domNodeRef = useRef(null);
  const chartRef = useRef(null);
  const providerValueRef = useRef(null);

  useLayoutEffect(() => {
    const myChart = initHighcharts(restProps, domNodeRef.current);
    chartRef.current = myChart;

    const needsRedraw = debounce(() => {
      if(!myChart.__destroyed) {
        attempt(myChart.redraw.bind(myChart));
      }
    });
    const getChart = () => ({
      object: myChart,
      type: restProps.chartType,
      get: myChart.get.bind(myChart),
      setSize: myChart.setSize.bind(myChart),
      update: clean(myChart.update.bind(myChart)),
      addAxis: clean(myChart.addAxis.bind(myChart)),
      addSeries: clean(myChart.addSeries.bind(myChart)),
      setTitle: clean(myChart.setTitle.bind(myChart)),
      setCaption: clean(myChart.setCaption.bind(myChart)),
      showLoading: myChart.showLoading.bind(myChart),
      hideLoading: myChart.hideLoading.bind(myChart),
      addCredits: clean(myChart.addCredits.bind(myChart)),
      addAnnotation: myChart.addAnnotation ? clean(myChart.addAnnotation.bind(myChart)) : null,
      removeAnnotation: myChart.removeAnnotation ? myChart.removeAnnotation.bind(myChart) : null
    });

    providerValueRef.current = { getChart, needsRedraw };
    if(callback) callback(myChart);
    setRendered(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(() => {
    return () => {
      const myChart = chartRef.current;
      if (myChart) { // Fixes #14
        window.requestAnimationFrame(myChart.destroy.bind(myChart));
        myChart.__destroyed = true;
      }
    }
  },[]);

  const prevProps = usePrevious(restProps);

  useEffect(() => {
    if(!rendered) return;
    const { plotOptions } = restProps;
    const myChart = chartRef.current;
    const needsRedraw = providerValueRef.current.needsRedraw;
    if (isEqual(prevProps.plotOptions, plotOptions) === false && myChart) {
      myChart.update({ plotOptions }, false);
      needsRedraw();
    }
  });

  return (
    <div
      className={`chart ${className}`}
      ref={ domNodeRef }>
      {rendered && (
        <Provider value={providerValueRef.current}>
          {children}
        </Provider>
      )}
    </div>
  );

}

const initHighcharts = (props, domNode) => {
  if (!domNode) {
    return;
  }

  const { chartCreationFunc, callback, chart, polar, gauge, styledMode = false, children, ...rest } = props;

  const opts = {
    chart: {
      styledMode,
      ...chart,
    },
    title: {
      text: null
    },
    subtitle: {
      text: null
    },
    legend: {
      enabled: false
    },
    rangeSelector: {
      enabled: false
    },
    navigator: {
      enabled: false
    },
    scrollbar: {
      enabled: false
    },
    tooltip: {
      enabled: false
    },
    credits: {
      enabled: false
    },
    series: [],
    xAxis: [],
    yAxis: [],
    ...rest
  };
  const myChart = chartCreationFunc(domNode, opts);

  myChart.polar = polar;
  myChart.angular = gauge;

  return myChart;
}


BaseChart.propTypes = {
  chartCreationFunc: PropTypes.func.isRequired,
  chartType: validChartTypes.isRequired,
};

export default BaseChart;

import React, { useEffect, useRef } from 'react';
import { Column, Line, Waterfall, Pie } from '@antv/g2plot';

const ChartRenderer = ({ chartType, data, columns, analysis }) => {
  const chartRef = useRef(null);
  const plotRef = useRef(null);

  const generateChartConfig = (type, data, analysis) => {
    const timeColumns = analysis?.time_columns || [];
    const categoryColumns = analysis?.category_columns || [];
    const metricColumns = analysis?.metric_columns || [];

    let xField = null;
    let yFields = [];

    if (timeColumns.length > 0) {
      xField = timeColumns[0];
    } else if (categoryColumns.length > 0) {
      xField = categoryColumns[0];
    } else if (columns && columns.length > 0) {
      xField = columns[0];
    }

    if (metricColumns.length > 0) {
      yFields = metricColumns;
    } else if (columns) {
      for (const col of columns) {
        if (col !== xField) {
          yFields.push(col);
        }
      }
    }

    if (yFields.length === 0) {
      yFields = xField ? [xField] : (columns && columns[0] ? [columns[0]] : ['value']);
    }

    const processedData = data.map(item => {
      const newItem = { ...item };
      if (timeColumns.includes(xField) && newItem[xField]) {
        if (newItem.report_year && newItem.report_quarter) {
          newItem[xField] = `${newItem.report_year}Q${newItem.report_quarter}`;
        }
      }
      return newItem;
    });

    return {
      xField,
      yFields,
      processedData
    };
  };

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    if (plotRef.current) {
      plotRef.current.destroy();
      plotRef.current = null;
    }

    const { xField, yFields, processedData } = generateChartConfig(chartType, data, analysis);

    let plot;

    switch (chartType) {
      case 'column':
        plot = new Column(chartRef.current, {
          data: processedData,
          xField: xField,
          yField: yFields.length === 1 ? yFields[0] : yFields,
          isGroup: yFields.length > 1,
          isStack: false,
          columnStyle: {
            radius: [4, 4, 0, 0],
          },
          label: {
            position: 'top',
            formatter: (value) => {
              if (typeof value === 'number' && Math.abs(value) >= 10000) {
                return (value / 10000).toFixed(1) + '万';
              }
              return value;
            }
          },
          tooltip: {
            formatter: (datum) => {
              const formatted = {};
              yFields.forEach(field => {
                const value = datum[field];
                if (typeof value === 'number' && Math.abs(value) >= 10000) {
                  formatted[field] = (value / 10000).toFixed(2) + ' 万元';
                } else {
                  formatted[field] = value;
                }
              });
              return formatted;
            }
          },
          color: ['#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#6F5EF9'],
        });
        break;

      case 'line':
        plot = new Line(chartRef.current, {
          data: processedData,
          xField: xField,
          yField: yFields.length === 1 ? yFields[0] : yFields,
          point: {
            size: 5,
            shape: 'diamond',
          },
          label: {
            style: {
              fill: '#aaa',
            },
            formatter: (value) => {
              if (typeof value === 'number' && Math.abs(value) >= 10000) {
                return (value / 10000).toFixed(1) + '万';
              }
              return value;
            }
          },
          tooltip: {
            formatter: (datum) => {
              const formatted = {};
              yFields.forEach(field => {
                const value = datum[field];
                if (typeof value === 'number' && Math.abs(value) >= 10000) {
                  formatted[field] = (value / 10000).toFixed(2) + ' 万元';
                } else {
                  formatted[field] = value;
                }
              });
              return formatted;
            }
          },
          color: ['#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#6F5EF9'],
        });
        break;

      case 'waterfall':
        plot = new Waterfall(chartRef.current, {
          data: processedData,
          xField: xField,
          yField: yFields[0] || 'value',
          total: {
            label: '总计',
            style: {
              fill: '#333',
            },
          },
          labelMode: 'difference',
          label: {
            style: {
              fill: '#333',
            },
            formatter: (value) => {
              if (typeof value === 'number' && Math.abs(value) >= 10000) {
                return (value / 10000).toFixed(1) + '万';
              }
              return value;
            }
          },
          color: {
            rising: '#f4664a',
            falling: '#30bf78',
            total: '#2b3a54',
          },
        });
        break;

      case 'pie':
        plot = new Pie(chartRef.current, {
          data: processedData,
          angleField: yFields[0] || 'value',
          colorField: xField,
          radius: 0.9,
          label: {
            type: 'outer',
            content: '{name}: {percentage}',
          },
          legend: {
            position: 'right',
          },
          tooltip: {
            formatter: (datum) => {
              const value = datum[yFields[0]];
              return {
                name: datum[xField],
                value: typeof value === 'number' && Math.abs(value) >= 10000 
                  ? (value / 10000).toFixed(2) + ' 万元' 
                  : value,
              };
            }
          },
        });
        break;

      default:
        plot = new Column(chartRef.current, {
          data: processedData,
          xField: xField,
          yField: yFields[0] || 'value',
          color: '#5B8FF9',
        });
    }

    plot.render();
    plotRef.current = plot;

    return () => {
      if (plotRef.current) {
        plotRef.current.destroy();
        plotRef.current = null;
      }
    };
  }, [chartType, data, columns, analysis]);

  if (!data || data.length === 0) {
    return (
      <div className="chart-empty">
        <p>暂无数据可显示</p>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div ref={chartRef} className="chart-plot"></div>
    </div>
  );
};

export default ChartRenderer;

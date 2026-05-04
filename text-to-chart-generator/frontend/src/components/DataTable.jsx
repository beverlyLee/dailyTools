import React from 'react';

const DataTable = ({ data, columns }) => {
  if (!data || data.length === 0) {
    return (
      <div className="table-empty">
        <p>暂无数据</p>
      </div>
    );
  }

  const formatValue = (value) => {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'number') {
      if (Math.abs(value) >= 10000) {
        return (value / 10000).toFixed(2) + ' 万';
      }
      return value.toLocaleString();
    }
    return String(value);
  };

  return (
    <div className="data-table-container">
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={index}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col, colIndex) => (
                  <td key={colIndex}>
                    {formatValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-info">
        共 {data.length} 条记录
      </div>
    </div>
  );
};

export default DataTable;

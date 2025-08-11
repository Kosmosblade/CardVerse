// CollectionAnalytics.js
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

// Example color palette for chart slices
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AA336A', '#3399FF'];

function CollectionAnalytics({ inventory }) {
  // Aggregate counts by color
  const colorCounts = {};
  inventory.forEach(card => {
    // Assume each card has a 'colors' array (e.g., ['Red', 'Blue']), or use 'Colorless' if empty
    const colors = card.colors?.length ? card.colors : ['Colorless'];
    colors.forEach(color => {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    });
  });
  const colorsData = Object.entries(colorCounts).map(([name, value]) => ({ name, value }));

  // Aggregate counts by type (assume card.type is a string like 'Creature', 'Land', etc.)
  const typeCounts = {};
  inventory.forEach(card => {
    const type = card.type || 'Unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  const typesData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

  // Aggregate counts by set (assume card.set is a set code or name)
  const setCounts = {};
  inventory.forEach(card => {
    const set = card.set || 'Unknown';
    setCounts[set] = (setCounts[set] || 0) + 1;
  });
  const setsData = Object.entries(setCounts).map(([name, value]) => ({ name, value }));

  return (
    <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
      <div>
        <h3>Color Distribution</h3>
        <PieChart width={300} height={300}>
          <Pie
            data={colorsData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          >
            {colorsData.map((entry, index) => (
              <Cell key={`cell-color-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </div>

      <div>
        <h3>Type Distribution</h3>
        <PieChart width={300} height={300}>
          <Pie
            data={typesData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          >
            {typesData.map((entry, index) => (
              <Cell key={`cell-type-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </div>

      <div>
        <h3>Set Distribution</h3>
        <PieChart width={300} height={300}>
          <Pie
            data={setsData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          >
            {setsData.map((entry, index) => (
              <Cell key={`cell-set-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </div>
    </div>
  );
}

export default CollectionAnalytics;

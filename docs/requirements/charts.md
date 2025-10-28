The screenshot shows a data visualization dashboard. In the top toolbar, there are several icons that typically represent different chart types available for selection. I will list them in the order they appear and describe them.

Based on the visible icons in the toolbar (just below "Enter title for your visualization"), here is the description:

1.  Table/Grid: An icon with horizontal lines, suggesting a basic data table or grid view.
    
2.  Bar/Column Chart: An icon with vertical bars of varying heights.
    
3.  Line Chart: An icon with a connected line, indicating a trend visualization.
    
4.  Area Chart: An icon showing the area beneath a line filled in.
    
5.  Pie/Donut Chart: A circular chart divided into slices.
    
6.  Funnel/Pyramid Chart: A vertical shape narrowing towards the bottom, often used for process flow or stages.
    
7.  Gauge/Dial Chart: A semi-circular chart with a needle, used to show a value against a scale.
    
8.  Map/Geographic Visualization: An icon resembling a map of the world or a specific region.
    
9.  Scatter Plot: An icon with small dots spread across a plane.
    
10.  Treemap: An icon showing nested rectangles of varying sizes.
     
11.  Pivot Table: An icon with a grid structure and arrows, often used for cross-tabulation of data.
     
12.  Sankey/Flow Diagram: An icon showing connected bands of varying widths, representing flow.
     

Here is the description formatted for the user:

"The visualization toolbar contains a series of icons representing different chart types. These icons, from left to right, appear to be:

1.  Table/Grid: Icon with horizontal lines.
    
2.  Bar/Column Chart: Icon with vertical bars.
    
3.  Line Chart: Icon with a single connected line.
    
4.  Area Chart: Icon showing a filled area under a line.
    
5.  Pie/Donut Chart: Circular chart divided into segments.
    
6.  Funnel/Pyramid Chart: Icon with a narrowing vertical shape.
    
7.  Gauge/Dial Chart: Semi-circular icon with a pointer.
    
8.  Map/Geographic Visualization: Icon resembling a world map.
    
9.  Scatter Plot: Icon with several small dots.
    
10.  Treemap: Icon with nested, size-varying rectangles.
     
11.  Pivot Table: Icon with a structured grid and directional arrows.
     
12.  Sankey/Flow Diagram: Icon showing connected, width-varying bands."
     

I do not need to use the google:search tool as all the necessary information is visible within the provided image.The visualization toolbar in the attached screenshot displays a sequence of icons, each representing a different type of chart or data display.

Here is a brief description of the types of charts shown, from left to right:

1.  Table/Grid: An icon with horizontal lines, suggesting a basic spreadsheet or data table view.
    
2.  Bar/Column Chart: An icon with vertical bars of varying heights, typically used for comparing different categories.
    
3.  Line Chart: An icon with a single connected line, primarily for visualizing trends over time or continuous data.
    
4.  Area Chart: An icon showing the area beneath a connected line filled in, similar to a line chart but emphasizing volume.
    
5.  Pie/Donut Chart: A circular chart divided into slices, used to show parts of a whole.
    
6.  Funnel/Pyramid Chart: A vertical shape narrowing towards the bottom, often used to illustrate stages in a process (e.g., sales pipeline).
    
7.  Gauge/Dial Chart: A semi-circular chart with a needle, typically used to display a single value against a specified range or goal.
    
8.  Map/Geographic Visualization: An icon resembling a world map, used for displaying data on a geographical context.
    
9.  Scatter Plot: An icon with several small dots, used to show the relationship between two variables.
    
10.  Treemap: An icon showing nested rectangles of varying sizes, used to display hierarchical data using size and color.
     
11.  Pivot Table: An icon with a structured grid and arrows, representing a tool for summarizing and reorganizing selected columns and rows of data.
     
12.  Sankey/Flow Diagram: An icon showing connected bands of varying widths, used to visualize flow and distribution.
     

This description can be used as a prompt for an LLM to define the purpose and characteristics of these chart types in the application context.


The specialized chart types require different data structures and have unique configuration parameters compared to standard Bar or Line charts. Since you've chosen Apache ECharts as your library, here are the details for the most complex types in your list: Sankey, Treemap, Funnel, and Gauge.

### 1\. Sankey/Flow Diagram

Sankey diagrams visualize the flow and distribution of a quantity between stages or categories. This requires a data structure that explicitly defines the source, target, and weight of each connection, along with a separate list of the nodes themselves.

| Data Structure Key | Description | Example Value |
| --- | --- | --- |
| series.type | Must be set to 'sankey'. | 'sankey' |
| series.data (Nodes) | An optional list of all unique entities (nodes) in the flow. Nodes are often generated automatically from the links but can be defined here for custom styling. | \[{name: 'A'}, {name: 'B'}, {name: 'X'}\] |
| series.links | The most critical part. It defines the flow between nodes. Each link object must specify the start node, end node, and the flow value. | \[{source: 'A', target: 'X', value: 5}\] |
| Specific Parameters | nodeWidth, nodeGap, layoutIterations | These control the visual appearance, like the width of the node rectangles and the number of times the layout algorithm runs to optimize node positioning. |

Example of links structure:

JSON

links: \[  
  { source: 'Sales', target: 'Accepted', value: 100 },  
  { source: 'Accepted', target: 'Converted', value: 75 },  
  { source: 'Accepted', target: 'Rejected', value: 25 }  
\]  
  

The flow volume is represented by the value in the links array.

* * *

### 2\. Treemap

Treemaps visualize hierarchical (tree-structured) data as a set of nested rectangles, where the size of each rectangle is proportional to its value and its color often represents a secondary dimension.

| Data Structure Key | Description | Example Value |
| --- | --- | --- |
| series.type | Must be set to 'treemap'. | 'treemap' |
| series.data | A single array of objects representing the root level. To create nested/hierarchical data, an item must contain a children array. | \[{name: 'Region A', value: 100, children: \[...\]}\] |
| Key Properties | name, value, children | value determines the size of the rectangle. name is the label. children contains the nested data. |
| Specific Parameters | leafDepth, levels, squareRatio | levels controls the visual style, colors, and border for each hierarchical level. leafDepth can limit the displayed depth of the tree. |

Example of data structure:

JSON

data: \[  
  {  
    name: 'Asia',  
    value: 300,  
    children: \[  
      { name: 'China', value: 150 },  
      { name: 'India', value: 100 }  
    \]  
  },  
  {  
    name: 'Europe',  
    value: 200  
  }  
\]  
  

* * *

### 3\. Funnel/Pyramid Chart

Funnel charts show the successive reduction of data as it passes through sequential phases.

| Data Structure Key | Description | Example Value |
| --- | --- | --- |
| series.type | Must be set to 'funnel'. | 'funnel' |
| series.data | A flat array of objects, where each object represents a stage in the funnel. | \[{value: 100, name: 'Stage A'}\] |
| Key Properties | value, name | value determines the width of the funnel section. name is the stage label. ECharts often sorts this data by value by default (largest at the top) unless specified otherwise. |
| Specific Parameters | sort, gap, funnelAlign | sort controls the order (e.g., 'descending' or 'none'). gap sets the spacing between funnel segments. funnelAlign controls whether the segments are aligned to the 'left', 'right', or 'center'. |

Example of data structure:

JSON

data: \[  
  { value: 1000, name: 'Impressions' },  
  { value: 500, name: 'Clicks' },  
  { value: 100, name: 'Conversions' }  
\]  
  

* * *

### 4\. Gauge/Dial Chart

Gauge charts display a single value within a minimum and maximum range, often divided into color-coded sections.

| Data Structure Key | Description | Example Value |
| --- | --- | --- |
| series.type | Must be set to 'gauge'. | 'gauge' |
| series.data | An array containing a single object with the current value to be displayed by the pointer. | \[{value: 85, name: 'Completion'}\] |
| Key Properties | value, name | value is the pointer reading. name is the label for the pointer. |
| Specific Parameters | min, max, startAngle, endAngle, axisLine.lineStyle.color | min and max set the scale boundaries. The axisLine.lineStyle.color is a critical parameter where you define color stops to create the colored sections (e.g., green, yellow, red) on the gauge track. |

Example of series configuration:

JSON

  
  

series: \[  
  {  
    type: 'gauge',  
    min: 0,  
    max: 100,  
    data: \[{ value: 75.5, name: 'KPI Score' }\],  
    axisLine: {  
      lineStyle: {  
        width: 30,  
        color: \[  
          \[0.6, '#63869e'\], // 0% to 60% is blue/grey  
          \[0.8, '#c23531'\], // 60% to 80% is red  
          \[1, '#2f4554'\]    // 80% to 100% is dark blue  
        \]  
      }  
    }  
  }  
\]
# Optiqo Application Overview

Based on the provided screenshots, the Optiqo application is a robust business intelligence and data visualization platform. It is designed to assist users in a comprehensive workflow, from connecting to data sources and analyzing information to creating and sharing interactive dashboards and reports. The application appears to be a multi-faceted tool for both technical users (data connection) and business users (dashboard creation and reporting).

### Key Features and Workflow:

#### 1\. Data Connection and Integration

The app provides a structured, four-step process for integrating new data sources. This process is clearly laid out with visual indicators showing progress: Integration, Data Schema, References, and Data Transfer. Users can connect to various types of data, including external databases and flat files. The platform appears to handle the technical aspects of data ingestion while providing a user-friendly interface to define data schemas and relationships.

#### 2\. Analysis and Visualization

Once the data is connected, users can enter the "Analyze" section to build visualizations. The interface allows users to select data fields for the X and Y axes and apply filters to create a variety of charts, such as bar charts and pie charts. The focus is on providing a self-service environment where users can drag and drop fields to create meaningful visual representations of their data.

#### 3\. Dashboard Creation and Reporting

The core output of the application is the creation and management of dashboards. The dashboard serves as a centralized location for monitoring key metrics and insights. These dashboards can be shared internally with other users and externally via secure links or embed codes, with options for password protection. The reporting feature allows for the scheduling of recurring reports in multiple file formats, which is a critical feature for automating business processes.

#### 4\. User and Account Management

The app includes comprehensive user and account management features. It supports different user roles (Admin, User, Viewer) and provides a dedicated area for managing user access and permissions. This indicates that the application is designed for multi-user, collaborative environments and has built-in features to manage team access and data security.

### Screenshot Breakdown

#### Skärmavbild 2025-09-04 kl. 20.11.07.jpg

Description: This is the main dashboard and welcome screen. It shows an "Account overview" with key metrics like the number of charts, dashboards, users, and viewers. On the left, it shows connected data sources and dashboards. On the right, it has sections for "Activity levels" and "Reports."

Comments: This screen serves as the central hub of the application. It gives the user a quick glance at their activity and provides shortcuts to key features like creating a new report or alert. The "Welcome back, Martin" message personalizes the experience.

#### Skärmavbild 2025-09-04 kl. 20.11.12.jpg

Description: This screen displays the list of connected data sources, categorized as "Databases" and "Flat Files." It shows an existing database connection and a CSV file.

Comments: This is the starting point for connecting to data. The simple layout with an "+ add data source" button and clear categories makes it easy for a user to understand what kind of data can be ingested.

#### Skärmavbild 2025-09-04 kl. 20.11.17.jpg

Description: This is the first step of the "Integration" wizard for adding a new data source. It prompts the user to enter database credentials like host, username, password, and port.

Comments: This screen is for a more technical user who needs to connect to an external database. The form fields are standard for a database connection, and the option for SSH tunneling adds another layer of connectivity.

#### Skärmavbild 2025-09-04 kl. 20.11.22.jpg

Description: This is the second step, "Data Schema." It shows a list of tables and their corresponding fields from the connected database. Users can select which fields to use, define an "Internal Label," and specify the "Cast type" and "Aggregation" method.

Comments: This screen allows users to prepare their data for analysis. By letting them choose fields and their data types, it ensures that the data is structured correctly before being used to build charts.

#### Skärmavbild 2025-09-04 kl. 20.11.28.jpg

Description: This is the "References" step. It displays existing foreign keys within the database and allows the user to add new ones.

Comments: This step is crucial for establishing relationships between different data tables, which is essential for creating complex visualizations and accurate reports. It shows that the app handles relational data.

#### Skärmavbild 2025-09-04 kl. 20.11.33.jpg

Description: This is the final "Data Transfer" screen, confirming that the remote connection was successful. It prompts the user to "go to analyze" to start exploring their data.

Comments: This screen provides a clear confirmation that the data connection process is complete and guides the user to the next logical step in the workflow.

#### Skärmavbild 2025-09-04 kl. 20.11.47.jpg

Description: The "Analyze" screen for creating a new visualization. It shows a list of data fields on the left. The user can drag and drop fields to the "Y-AXIS" and "BREAK DOWN BY" sections. A bar chart is shown in the main view.

Comments: This is the creative part of the application where users transform data into insights. The drag-and-drop interface is intuitive and makes the process of building a chart accessible to non-technical users.

#### Skärmavbild 2025-09-04 kl. 20.11.54.jpg

Description: Another view of the "Analyze" screen, this time showing a pie chart. The right-hand panel shows the "Chart Area" settings, where users can customize labels, number formats, and the legend.

Comments: This demonstrates the flexibility of the visualization engine. The user has granular control over the chart's appearance, ensuring it looks exactly as they want it to.

#### Skärmavbild 2025-09-04 kl. 20.11.58.png

Description: A modal window for saving a chart. Users can save the chart to a "New Dashboard," an "Existing Dashboard," or their "My Desk."

Comments: This shows the integration between the "Analyze" and "Dashboard" features. It gives the user control over how their newly created chart is organized within the application.

#### Skärmavbild 2025-09-04 kl. 20.12.19.jpg

Description: A complete dashboard titled "Dashboard - Driftsansvarlig - VIP Center." It contains several charts and tables, including gauges for progress, and tables for data entries.

Comments: This screenshot provides a real-world example of a finished dashboard, showing how multiple visualizations and data tables can be combined to provide a comprehensive view of a specific area.

#### Skärmavbild 2025-09-04 kl. 20.12.22.jpg

Description: A "Share Dashboard" modal with two tabs: "Users" and "Viewers." This tab displays the list of internal users and their roles (Admin in this case) with toggle switches to grant them access.

Comments: This highlights the internal collaboration features. It allows the dashboard owner to control who within their organization can view the dashboard.

#### Skärmavbild 2025-09-04 kl. 20.12.26.jpg

Description: The "Public URL" tab within the "Share Dashboard" modal. It provides a public URL and an <iframe> embed code for external sharing. It also has an option to make the link password protected.

Comments: This feature extends the sharing capabilities beyond the organization, allowing users to embed or share dashboards on external websites or with clients, with optional security measures.

#### Skärmavbild 2025-09-04 kl. 20.12.38.jpg

Description: The "Create new report" form. It has sections for "Recipients and Email details," "Content," and "Schedule Report." Users can select a report title, recipients, subject, and message. They can also specify the content scope (Single Tab or Dashboard) and the report format (XLS, CSV, PDF, or PNG).

Comments: This shows the advanced reporting functionality. The ability to schedule reports and send them in different formats is a key feature for automating data distribution.

#### Skärmavbild 2025-09-04 kl. 20.12.45.jpg

Description: A slight variation of the "Create new report" form, but with the "Format" section showing checkboxes for selecting multiple output formats.

Comments: This indicates the flexibility of the reporting tool. Users are not limited to a single format and can select multiple types for their report.

#### Skärmavbild 2025-09-04 kl. 20.12.50.png

Description: The main application menu, a sidebar that appears to be a user profile or account settings menu. It lists options like "My Desk," "Users," "Viewers," "SSO," "Account," "Support," "Plan & Billing," and "Sign out."

Comments: This menu provides access to administrative and account-level settings, confirming that the application has a comprehensive system for user and plan management.

#### Skärmavbild 2025-09-04 kl. 20.12.59.jpg

Description: The "Viewers" section under the "Users" menu. It shows a list of viewers in the organization, including their email, name, viewer type, and group.

Comments: This provides a detailed view of the user base and demonstrates the granular control an administrator has over who can access the application's content.

#### ska\_\_rmavbild\_2025-09-08\_kl.\_09.28.25.png

Description: This screen shows the user management list with details of a selected user on the right. The details include the user's email, first name, last name, and role.

Comments: This provides a clear view of the user details that can be managed by an administrator. The ability to edit or delete a user is also present, showcasing the full administrative control.

#### ska\_\_rmavbild\_2025-09-08\_kl.\_09.29.20.png

Description: This is the main "Viewers" list under the "Users" menu. It displays a list of viewers with their email, name, viewer type, and group. There is an option to "add viewer" and manage "groups."

Comments: This screen provides a more detailed view of the viewer management capabilities, allowing administrators to see all viewers and organize them into groups.

#### ska\_\_rmavbild\_2025-09-08\_kl.\_09.29.26.png

Description: A modal window for adding a new viewer. The form includes fields for email, first name, last name, language, viewer type, and groups. It also has a checkbox to "Send invitation emails."

Comments: This shows the process for inviting new viewers to the platform. The ability to send an automatic email streamlines the onboarding process.

#### ska\_\_rmavbild\_2025-09-08\_kl.\_09.31.52.png

Description: An alternative view of the "Share Dashboard" modal's "Users" tab. The content is similar to the previous screenshot but shows the modal with a dashboard in the background.

Comments: This confirms the consistency of the sharing features and shows how the modal appears over the primary dashboard content.

#### ska\_\_rmavbild\_2025-09-08\_kl.\_09.31.58.png

Description: The "Share Dashboard" modal on the "Viewers" tab. It shows a list of viewers who can be granted access to the specific dashboard.

Comments: This is a new view that highlights the specific functionality of granting dashboard access to viewers, separate from standard users.

#### ska\_\_rmavbild\_2025-09-08\_kl.\_09.32.03.png

Description: An alternative view of the "Share Dashboard" modal's "Public URL" tab. It displays the public URL and embed code for sharing.

Comments: This is another example of the public sharing feature, reinforcing its availability.
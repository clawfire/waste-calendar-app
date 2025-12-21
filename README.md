# Luxembourg Waste Collection Calendar 🇱🇺 🚛

A premium, modern web application to consult and subscribe to municipal waste collection schedules in Luxembourg. Built with a focus on visual excellence, performance, and user experience.

![Project Preview](file:///Users/thibault/.gemini/antigravity/brain/8b3b2470-6b88-41a1-a89c-8c4e53cf101f/uploaded_image_1766352440546.png)

## ✨ Features

- **📍 Smart Geolocation**: "Locate Me" button that uses the browser Geolocation API and OpenStreetMap Nominatim to automatically detect your address and fill the form.
- **🔍 Searchable Dropdowns**: Custom-built, high-performance select components with integrated search for Communes, Localities, and Streets.
- **✨ Premium UI/UX**:
    - **Glassmorphism Design**: Sleek dark theme with rich gradients, blur effects, and smooth micro-animations.
    - **Dynamic Highlighting**: A "Prochaine Collecte" card that dynamically changes colors based on the waste type(s) scheduled for that day.
    - **Grouped Schedule**: Clear, date-grouped list of all future collections for easy planning.
- **📅 Calendar Integration**:
    - **One-shot Download**: Export your schedule as a `.ics` file.
    - **Live Subscription**: `webcal://` link for automatic updates in your favorite calendar app (Apple Calendar, Google Calendar, Outlook).
- **🚀 Ultra-Lightweight**: Built with React and Vanilla CSS, intentionally avoiding heavy UI libraries for maximum control and performance.

## 🛠️ Tech Stack

- **Core**: [React 18](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Vanilla CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) (Custom Design System)
- **Icons**: [React Icons](https://react-icons.github.io/react-icons/) (Ionicons)
- **Geolocation**: [Browser Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) & [Nominatim OpenStreetMap](https://nominatim.org/)
- **Deployment**: [Netlify](https://www.netlify.com/)

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm

### Installation

1. Navigate to the project directory:
   ```bash
   cd waste-calendar-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

To create an optimized production build:
```bash
npm run build
```
The output will be in the `dist/` folder.

## 🌐 Deployment

This project is configured for easy deployment on **Netlify**.

1. Connect your GitHub repository to Netlify.
2. The `netlify.toml` file will automatically configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Redirects**: SPA fallback to `index.html`.

## 📄 License & Data

- **Data Source**: [Données ouvertes du gouvernement luxembourgeois](https://data.public.lu/fr/datasets/waste-municipal-waste-collection-calendars-dechets-calendriers-municipaux-de-collecte-des-dechets/)
- **Credits**: Created by [Thibault Milan](https://thibaultmilan.com) • Design by [Antigravity](https://antigravity.app)

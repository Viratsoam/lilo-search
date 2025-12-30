# Lilo Search Engine - Frontend (Next.js)

Modern, responsive frontend for the Lilo Search Engine built with Next.js 14 and React.

## Features

- 🎨 **Beautiful UI**: Modern gradient design with smooth animations
- 🔍 **Real-time Search**: Fast search with instant results
- 🎯 **Advanced Filters**: Filter by category, vendor, region, rating, inventory
- 👤 **Personalization**: User-specific search results
- 📊 **Statistics Dashboard**: View product statistics
- 📱 **Responsive Design**: Works on all devices

## Installation

```bash
cd client
npm install
```

## Configuration

Create a `.env.local` file (optional):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Search**: Enter a query in the search box (e.g., "nitrile gloves", "3 hp pump")
2. **Filters**: Use the filter inputs to narrow down results
3. **Personalization**: Enter a user ID to see personalized results based on order history
4. **Pagination**: Navigate through results using Previous/Next buttons

## Example Queries

- `nitrile gloves` - Basic product search
- `nitril glovs` - Test typo handling
- `3 hp sewage pump` - Search with specifications
- `tomato` - Should return food items
- `tomato makeup` - Should return cosmetics (context disambiguation)
- `spanner` - Synonym expansion (should find wrenches)

## Build

```bash
npm run build
npm start
```

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Axios for API calls
- CSS Modules for styling


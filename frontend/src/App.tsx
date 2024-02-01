import "./App.css";
import FleetPage from "./pages/FleetPage";
import FleetSelect from "./pages/FleetSelect";
import FleetStatus from "./pages/FleetStatus";
import FleetStructure from "./pages/FleetStructure";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="cat" element={<FleetSelect />} />
          <Route path="cat/:fleetID/" element={<FleetPage />}>
            <Route index element={<Navigate to="structure" replace />} />
            <Route path="structure" element={<FleetStructure />} />
            <Route path="status" element={<FleetStatus />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;

import "./App.css";
import FleetStatus from "./components/FleetStatus";
import ActiveFleetSelect from "./components/active/ActiveFleetSelect";
import RecentFleetSelect from "./components/recent/RecentFleetSelect";
import ActiveFleetPage from "./pages/ActiveFleetPage";
import FleetStructure from "./pages/FleetStructure";
import IndexPage from "./pages/IndexPage";
import RecentFleetPage from "./pages/RecentFleetPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="cat" element={<IndexPage />}>
            <Route path="active" element={<ActiveFleetSelect />} />
            <Route path="active/:fleetID/" element={<ActiveFleetPage />}>
              <Route path="structure" element={<FleetStructure />} />
              <Route path="status" element={<FleetStatus />} />
              <Route index element={<Navigate to="structure" replace />} />
            </Route>
            <Route path="recent" element={<RecentFleetSelect />} />
            <Route path="recent/:fleetID/" element={<RecentFleetPage />}>
              <Route path="status" element={<FleetStatus />} />
              <Route index element={<Navigate to="status" replace />} />
            </Route>
            <Route index element={<Navigate to="active" replace />} />
          </Route>
          <Route index element={<Navigate to="cat" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;

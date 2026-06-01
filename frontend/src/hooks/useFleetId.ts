import { useParams } from "react-router-dom";

export function useFleetId(): number {
  const { fleetID } = useParams();
  if (!fleetID) throw new Error("fleetID route param is missing");
  return +fleetID;
}

import { Cat } from "../api/Cat";
import TrackFleetSelect from "./TrackFleetSelect";
import { useQuery } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";

const performTrackFleetRequest = async (characterID: number) => {
  console.log("performTrackFleetRequest");
  const csrf = Cookies.get("csrftoken");
  const api = new Cat();
  const response = await api.aacatApiTrackCharacter(characterID, {
    headers: { "X-Csrftoken": csrf ? csrf : "" },
  });
  console.log(response);
  return response.data;
};
//performTrackFleetRequest(inputValue);
const TrackFleetSearch = () => {
  const [character, setCharacter] = useState(0);
  const { data, status, refetch, isFetching } = useQuery({
    queryKey: ["performTrackFleetRequest", character],
    queryFn: () => performTrackFleetRequest(character),
    enabled: false,
  });

  async function trackFleet() {
    return await refetch();
  }

  return (
    <Card style={{ width: "24rem" }} className="m-4">
      <Card.Img
        variant="top"
        src={`https://images.evetech.net/characters/${character}/portrait?size=256`}
      />
      <Card.Body>
        <Card.Title>Track New Fleet</Card.Title>
        <hr />
        <TrackFleetSelect setCharacter={setCharacter} />

        <Button disabled={isFetching || character == 0} onClick={trackFleet} className="w-100 mt-2">
          Track Fleet
        </Button>
      </Card.Body>
      <Card.Footer className="text-muted">
        {isFetching
          ? `Sending request to track: ${data?.character_name}`
          : data
          ? `Requested tracking of: ${data?.character_name}`
          : `state: ${status}`}
      </Card.Footer>
    </Card>
  );
};

export default TrackFleetSearch;

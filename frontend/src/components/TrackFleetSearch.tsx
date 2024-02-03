import { getCatApi } from "../api/Api";
import TrackFleetSelect from "./TrackFleetSelect";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";

const performTrackFleetRequest = async (characterID: number) => {
  const { POST } = getCatApi();

  const { data, error } = await POST("/cat/api/fleets/{character_id}/track", {
    params: {
      path: { character_id: characterID },
    },
  });
  if (error) {
    console.log(error);
  } else {
    console.log(data);
    return data;
  }
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
          ? `Sending request to track: ${character}`
          : data
          ? `Requested tracking of: ${data?.character_name}`
          : `state: ${status}`}
      </Card.Footer>
    </Card>
  );
};

export default TrackFleetSearch;

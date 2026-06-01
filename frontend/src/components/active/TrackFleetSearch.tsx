import { performTrackFleetRequest } from "../../api/Methods";
import CharacterSeachSelect from "../CharacterSeachSelect";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";

const TrackFleetSearch = () => {
  const [character, setCharacter] = useState(0);

  const mutation = useMutation({
    mutationFn: () => performTrackFleetRequest(character),
  });

  const footerText = () => {
    if (mutation.isPending) return `Sending request to track: ${character}`;
    if (mutation.isSuccess) return `Requested tracking of: ${mutation.data?.character_name}`;
    if (mutation.isError) return "Error — could not track fleet";
    return "Select a character to track";
  };

  return (
    <Card style={{ width: "24rem" }} className="m-4">
      <Card.Img
        variant="top"
        src={`https://images.evetech.net/characters/${character}/portrait?size=256`}
        alt="Selected character portrait"
      />
      <Card.Body>
        <Card.Title>Track New Fleet</Card.Title>
        <hr />
        <CharacterSeachSelect setCharacter={setCharacter} />
        <Button
          disabled={mutation.isPending || character === 0}
          variant={mutation.isError ? "danger" : "primary"}
          onClick={() => mutation.mutate()}
          className="w-100 mt-2"
        >
          Track Fleet
        </Button>
      </Card.Body>
      <Card.Footer className="text-muted">{footerText()}</Card.Footer>
    </Card>
  );
};

export default TrackFleetSearch;

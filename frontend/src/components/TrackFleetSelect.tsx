import { Cat } from "../api/Cat";
import { Character } from "../api/data-contracts";
import Cookies from "js-cookie";
import AsyncSelect from "react-select/async";

type ValueType = { label: string; value: number };

const performCharacterSearchRequest = async (searchText: string) => {
  console.log("performCharacterSearchRequest");
  const csrf = Cookies.get("csrftoken");
  const api = new Cat();
  const response = await api.aacatApiCharacterSearch(
    {
      search_text: searchText,
      limit: 10,
    },
    {
      headers: { "X-Csrftoken": csrf ? csrf : "" },
    }
  );

  return response.data?.map((d: Character) => {
    return {
      label: `${d.character_name} (${d.corporation_name}) [${d.alliance_name}]`,
      value: d.character_id,
    };
  });
};

const TrackFleetSelect = ({
  setCharacter,
}: {
  setCharacter: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const noOptionsMessage = (obj: { inputValue: string }) => {
    if (obj.inputValue.trim().length === 0) {
      return null;
    }
    return "No Matching Characters";
  };

  const loadOptions = (inputValue: string) => {
    return performCharacterSearchRequest(inputValue);
  };

  const processOnChange = (newValue: ValueType | null) => {
    if (newValue) {
      setCharacter(newValue.value);
    }
  };

  return (
    <>
      <AsyncSelect
        styles={{
          option: (styles) => {
            return {
              ...styles,
              color: "black",
            };
          },
        }}
        loadOptions={loadOptions}
        noOptionsMessage={noOptionsMessage}
        onChange={processOnChange}
      />
    </>
  );
};

export default TrackFleetSelect;

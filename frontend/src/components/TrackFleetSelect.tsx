import { getCatApi } from "../api/Api";
import { components } from "../api/CatApi";
import AsyncSelect from "react-select/async";

type ValueType = { label: string; value: number };

const performCharacterSearchRequest = async (searchText: string) => {
  console.log("performCharacterSearchRequest");
  const { POST } = getCatApi();

  const { data, error } = await POST("/cat/api/search/auth/character/", {
    params: {
      query: { search_text: searchText, limit: 10 },
    },
  });
  if (data) {
    return data?.map((d: components["schemas"]["Character"]) => {
      return {
        label: `${d.character_name} (${d.corporation_name}) [${d.alliance_name}]`,
        value: d.character_id,
      };
    });
  } else {
    console.log(error);
    return [];
  }
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

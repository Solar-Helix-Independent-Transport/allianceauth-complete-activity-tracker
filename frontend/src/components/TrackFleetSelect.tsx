import cookies from "js-cookies";
import AsyncSelect from "react-select/async";

const performCharacterSearchRequest = (searchText: string) => {
  console.log("performCharacterSearchRequest");
  console.log(cookies.getItem("csrftoken"));
  const response = fetch(
    `cat/api/search/auth/character/?search_text=${searchText ? searchText : "a"}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Csrftoken": cookies.getItem("csrftoken"),
      },
    }
  )
    .then((res) => res.json())
    .then((data) =>
      data?.map(
        (d: {
          character_name: string;
          corporation_name: string;
          alliance_name: string;
          character_id: number;
        }) => {
          return {
            label: `${d.character_name} (${d.corporation_name}) [${d.alliance_name}]`,
            value: d.character_id,
          };
        }
      )
    );

  return response;
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

  const processOnChange = (newValue: unknown) => {
    setCharacter(newValue.value);
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

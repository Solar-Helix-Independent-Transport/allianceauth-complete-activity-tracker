import { performCharacterSearchRequest } from "../api/Methods";
import AsyncSelect from "react-select/async";

type ValueType = { label: string; value: number };

const CharacterSeachSelect = ({
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
        className="m-0"
        loadOptions={loadOptions}
        noOptionsMessage={noOptionsMessage}
        onChange={processOnChange}
        isClearable={true}
      />
    </>
  );
};

export default CharacterSeachSelect;

import Button from "./Button";
import StarIcon from "./StarIcon";

interface SaveButtonProps {
  isSaved: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

// "Save" turns into "Saved" once the city is a Favourite. The label carries the
// state, so it is the same button for Guests and signed-in users.
function SaveButton({ isSaved, disabled = false, onToggle }: SaveButtonProps) {
  return (
    <Button
      variant="secondary"
      icon={<StarIcon filled={isSaved} />}
      disabled={disabled}
      onClick={onToggle}
    >
      {isSaved ? "Saved" : "Save"}
    </Button>
  );
}

export default SaveButton;

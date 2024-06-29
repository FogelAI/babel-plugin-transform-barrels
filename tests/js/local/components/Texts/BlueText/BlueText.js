import { Text } from "../Text/Text";
import "./BlueText.css";

export function BlueText(props) {
  return <Text className="BlueText">{props.children}</Text>;
}

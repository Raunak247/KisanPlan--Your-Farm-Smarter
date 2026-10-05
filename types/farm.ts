export type CropId = "wheat" | "rice" | "cotton" | "tomato" | "soybean" | "maize";

export type CropStage =
  | "germination"
  | "vegetative"
  | "flowering"
  | "fruiting"
  | "maturity";

export type MotorState = "ON" | "OFF";

export type SprayAdvice = "DO_NOT_SPRAY" | "SUITABLE";

export type Drainage = "poor" | "moderate" | "free";

export type CropIcon =
  | "barley"
  | "rice"
  | "flower"
  | "fruit-cherries"
  | "seed"
  | "corn";

export type Place = {
  id: string;
  name: string;
  label: string;
  latitude: number;
  longitude: number;
};

export type FarmProfile = {
  place: Place;
  crop: CropId;
  stage: CropStage;
};

export type Session = {
  contact: string;
};

export type CropDefinition = {
  id: CropId;
  name: string;
  icon: CropIcon;
};

export const CROPS: CropDefinition[] = [
  { id: "wheat", name: "Wheat", icon: "barley" },
  { id: "rice", name: "Rice", icon: "rice" },
  { id: "cotton", name: "Cotton", icon: "flower" },
  { id: "tomato", name: "Tomato", icon: "fruit-cherries" },
  { id: "soybean", name: "Soybean", icon: "seed" },
  { id: "maize", name: "Maize", icon: "corn" },
];

export const STAGES: { id: CropStage; name: string; hint: string }[] = [
  { id: "germination", name: "Germination", hint: "Seed is just sprouting" },
  { id: "vegetative", name: "Vegetative", hint: "Leaves and stems are growing" },
  { id: "flowering", name: "Flowering", hint: "The crop is flowering" },
  { id: "fruiting", name: "Fruiting", hint: "Grain, boll, or fruit is forming" },
  { id: "maturity", name: "Maturity", hint: "Ready to harvest soon" },
];

export function cropById(id: CropId): CropDefinition {
  const crop = CROPS.find((item) => item.id === id);
  return crop ?? CROPS[0];
}

export function stageLabel(id: CropStage): string {
  return STAGES.find((item) => item.id === id)?.name ?? id;
}

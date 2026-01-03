interface Resources {
  "common": {
    "actions": {
      "cancel": "Cancel"
    },
    "app": {
      "changeLanguage": "Change language",
      "constructionPlanning": "Construction Planning",
      "fitToContent": "Fit to content",
      "strawbaler": "Strawbaler"
    },
    "autoSave": {
      "autoSaveFailed": "Auto-save failed",
      "autoSaved": "Auto-saved {{time}}",
      "autoSaving": "Auto-saving...",
      "errors": {
        "failedExport": "Failed to export project",
        "failedGenerateModel": "Failed to generate model",
        "failedIFCExport": "Failed to export IFC",
        "failedIFCImport": "Failed to import IFC file",
        "failedImport": "Failed to import file"
      },
      "exportBuildingModel": "Export Building Model",
      "exportConstructionModel": "Export Construction Model",
      "exportFailed": "Export/Import failed",
      "exporting": "Exporting...",
      "hoursAgo": "{{hours}}h ago",
      "import": "Import",
      "importExportIfc": "Import/Export IFC",
      "importing": "Importing...",
      "justNow": "Just now",
      "loadFromFile": "Load from File",
      "minutesAgo": "{{minutes}}m ago",
      "notSaved": "Not saved",
      "saveToFile": "Save to File"
    },
    "currentLanguageWithLabel": "Current language: {{language}}",
    "storeys": {
      "addNewFloor": "Add New Floor",
      "basement": "B{{level}}",
      "defaultBasementName_ordinal_few": "{{count}}rd Basement",
      "defaultBasementName_ordinal_one": "{{count}}st Basement",
      "defaultBasementName_ordinal_other": "{{count}}th Basement",
      "defaultBasementName_ordinal_two": "{{count}}nd Basement",
      "defaultName_ordinal_few": "{{count}}rd Floor",
      "defaultName_ordinal_one": "{{count}}st Floor",
      "defaultName_ordinal_other": "{{count}}th Floor",
      "defaultName_ordinal_two": "{{count}}nd Floor",
      "deleteFloor": "Delete floor",
      "deleteFloorConfirm": "Are you sure you want to delete the floor?",
      "deleteFloorTitle": "Delete Floor",
      "duplicateFloor": "Duplicate floor",
      "floor": "Floor {{level}}",
      "floorAssembly": "Floor Assembly",
      "floorHeight": "Floor Height",
      "floorName": "Floor name",
      "ground": "Ground",
      "groundFloor": "Ground Floor",
      "manageFloors": "Manage Floors",
      "manageFloorsTooltip": "Manage floors",
      "moveDown": "Move down",
      "moveUp": "Move up",
      "name": "Name",
      "noFloorsYet": "No floors yet.",
      "switchToFloor": "Switch to floor"
    },
    "units": {
      "liter": "L",
      "m3": "m³"
    },
    "viewMode": {
      "floors": "Floors",
      "roofs": "Roofs",
      "walls": "Walls"
    }
  },
  "config": {
    "common": {
      "add": "Add",
      "addNew": "Add New",
      "cancel": "Cancel",
      "color": "Color",
      "delete": "Delete",
      "density": "Density",
      "densityUnit": "kg/m³",
      "duplicate": "Duplicate",
      "height": "Height",
      "inUseCannotDelete": "In Use - Cannot Delete",
      "infillMaterial": "Infill Material",
      "inset": "Inset",
      "layerThickness": "Layer Thickness",
      "materialLabel": "Material",
      "name": "Name",
      "none": "None",
      "placeholder": "Select",
      "placeholders": {
        "name": "Assembly name",
        "selectDefault": "Select default...",
        "selectMaterial": "Select material..."
      },
      "reset": "Reset",
      "resetToDefaults": "Reset to Defaults",
      "spacing": "Spacing",
      "strawMaterialOverride": "Straw Material (Override)",
      "thickness": "Thickness",
      "totalHeight": "Total Height",
      "totalThickness": "Total Thickness",
      "type": "Type",
      "useGlobalStrawSettings": "Use global straw settings",
      "width": "Width"
    },
    "floors": {
      "configure": "Configure Floor Assembly",
      "copyNameTemplate": "{{name}} (Copy)",
      "defaultFloorAssembly": "Default Floor Assembly",
      "defaultLabel": "{{label}} <gray>(default)</gray>",
      "defaults": {
        "clt18cm": "CLT 18cm (6cm)",
        "concrete20cm": "Concrete 20cm (6cm)",
        "filledJoist8x36cm": "Filled Joist 8x36cm (6cm)",
        "joist8x24cm": "Joist 8x24cm (6cm)"
      },
      "delete": {
        "cannotDeleteInUse": "In Use - Cannot Delete",
        "cannotDeleteLast": "Cannot delete the last config",
        "confirm": "Are you sure you want to delete \"{{name}}\"? This action cannot be undone.",
        "confirmTitle": "Delete Floor Assembly",
        "noConfigSelected": "No config selected"
      },
      "emptyList": "No floor assemblies available",
      "labels": {
        "beamHeight": "Beam Height",
        "constructionHeight": "Construction Height",
        "wallBeamInsideOffset": "Inside Offset"
      },
      "layers": {
        "addBottomLayer": "Add Bottom Layer",
        "addTopLayer": "Add Top Layer",
        "bottomLayers": "Bottom Layers",
        "finishedBottom": "Finished Bottom",
        "finishedTop": "Finished Top",
        "floorConstruction": "Floor Construction",
        "noBottomLayers": "No bottom layers defined",
        "noTopLayers": "No top layers defined",
        "topLayers": "Top Layers"
      },
      "newName": {
        "filled": "New Filled Floor",
        "joist": "New Joist Floor",
        "monolithic": "New Monolithic Floor"
      },
      "reset": {
        "confirm": "Are you sure you want to reset default floor assemblies? This will restore the original default assemblies but keep any custom assemblies you've created. This action cannot be undone.",
        "title": "Reset Floor Assemblies"
      },
      "sections": {
        "ceilingSheathing": "Ceiling Sheathing",
        "joists": "Joists",
        "openingFrame": "Opening Frame",
        "openingSides": "Opening Sides",
        "perimeterFrame": "Perimeter Frame",
        "strawInfill": "Straw Infill",
        "subfloor": "Subfloor",
        "wallBeams": "Wall Beams"
      },
      "tips": {
        "beamHeight": "Height of structural beams. Applies to both joists and wall beams.",
        "constructionHeight": "Height of the floor structure (joist height).",
        "strawMaterialOverride": "Material used to fill spaces between joists. Leave empty to use global straw settings."
      },
      "types": {
        "joist": "Joist Floor",
        "monolithic": "Monolithic Floor",
        "straw": "Straw Filled Floor"
      }
    },
    "layers": {
      "copyFrom": "Copy from {{name}}",
      "defaultName_monolithic": "Monolithic Layer",
      "defaultName_striped": "Striped Layer",
      "defaults": {
        "battens": "Battens",
        "clayPlasterBase": "Base Plaster (Clay)",
        "clayPlasterFine": "Fine Plaster (Clay)",
        "counterBattens": "Counter Battens",
        "dhf": "DHF",
        "diagonalBracing": "Diagonal Bracing",
        "gypsumBoards": "Gypsum Boards",
        "impactSoundInsulation": "Impact Sound Insulation",
        "insulation": "Insulation",
        "limePlasterBase": "Base Plaster (Lime)",
        "limePlasterFine": "Fine Plaster (Lime)",
        "plasterGroundReed": "Plaster Ground (Reed)",
        "screed": "Screed",
        "tiles": "Tiles",
        "windBarrier": "Wind Barrier",
        "windPaper": "Wind Paper",
        "woodPlanking": "Wood Planking"
      },
      "direction": "Direction",
      "directions": {
        "colinear": "Colinear",
        "diagonal": "Diagonal",
        "perpendicular": "Perpendicular"
      },
      "gap": "Gap",
      "moveDown": "Move down",
      "moveUp": "Move up",
      "overlap": "Overlap with next layer",
      "presets": {
        "clayPlaster": "Clay Plaster",
        "clayPlasterDiagonal": "Clay Plaster + Diagonal Bracing",
        "gypsum": "Gypsum",
        "limePlaster": "Lime Plaster",
        "limePlasterDhf": "Lime Plaster + DHF",
        "limePlasterDiagonal": "Lime Plaster + Diagonal Bracing",
        "screed": "Screed",
        "tiles": "Tiles",
        "woodenPlanking": "Wooden Planking",
        "woodenPlankingDhf": "Wooden Planking + DHF"
      },
      "presetsLabel": "Presets",
      "removeLayer": "Remove layer",
      "selectMaterial": "Select material...",
      "stripe": "Stripe",
      "totalThicknessLabel": "{{thickness, length}}",
      "types": {
        "monolithic": "Monolithic",
        "striped": "Striped"
      }
    },
    "materials": {
      "add": "Add",
      "addCrossSection": "Add cross section",
      "addSheetSize": "Add sheet size",
      "addSize": "Add size",
      "addStockLength": "Add stock length",
      "addThickness": "Add thickness",
      "addVolume": "Add volume",
      "addVolumeOption": "Add volume option",
      "availableVolumes": "Available Volumes",
      "baleHeight": "Bale Height",
      "baleWidth": "Bale Width",
      "configure": "Configure Materials",
      "crossSectionLarger": "Cross section larger dimension",
      "crossSectionSmaller": "Cross section smaller dimension",
      "crossSections": "Cross Sections",
      "defaultStrawMaterial": "Default Straw Material",
      "defaults": {
        "battens": "Battens",
        "bitumen": "Bitumen",
        "boards": "Boards",
        "brick": "Brick",
        "cementScreed": "Cement Screed",
        "clayPlasterBase": "Clay Plaster (Base)",
        "clayPlasterFine": "Clay Plaster (Fine)",
        "clt": "Cross-laminated Timber (CLT)",
        "concrete": "Concrete",
        "cork": "Cork",
        "dhf": "DHF (Wood Fiber Board)",
        "fireProtectionBoarding": "Fire Protection Boarding",
        "glt": "Glulam (GLT)",
        "gypsum": "Gypsum Board",
        "impactSoundInsulation": "Impact Sound Insulation",
        "limePlasterBase": "Lime Plaster (Base)",
        "limePlasterFine": "Lime Plaster (Fine)",
        "osb": "OSB",
        "reed": "Reed Matting",
        "roughWood": "Rough-sawn Timber",
        "strawbale": "Strawbales",
        "structuralWood": "Structural Timber",
        "windBarrier": "Wind Barrier",
        "woodwool": "Woodwool"
      },
      "deleteConfirm": "Are you sure you want to delete \"{{name}}\"? This action cannot be undone.",
      "deleteTitle": "Delete Material",
      "duplicateNamePattern": "{{name}} (Copy)",
      "flakeSize": "Flake Size",
      "materialName": "Material name",
      "maxBaleLength": "Max Bale Length",
      "minBaleLength": "Min Bale Length",
      "newName_dimensional": "New dimensional material",
      "newName_generic": "New generic material",
      "newName_sheet": "New sheet material",
      "newName_strawbale": "New strawbale material",
      "newName_volume": "New volume material",
      "noCrossSections": "No cross sections configured",
      "noLengths": "No lengths configured",
      "noMaterialsYet": "No materials yet. Create one using the \"New\" button above.",
      "noSizes": "No sheet sizes configured",
      "noThicknesses": "No thicknesses configured",
      "noVolumes": "No volumes configured",
      "removeCrossSection": "Remove cross section",
      "removeSheetSize": "Remove sheet size",
      "removeStockLength": "Remove stock length",
      "removeThickness": "Remove thickness",
      "removeVolume": "Remove volume option",
      "resetConfirm": "Are you sure you want to reset all materials to default? This action cannot be undone.",
      "resetTitle": "Reset Materials",
      "selectStrawMaterial": "Select straw material...",
      "sheetLength": "Sheet length",
      "sheetSizes": "Sheet Sizes",
      "sheetType": "Sheet Type",
      "sheetTypeFlexible": "Flexible",
      "sheetTypeSolid": "Solid",
      "sheetTypeTongueAndGroove": "Tongue & Groove",
      "sheetWidth": "Sheet width",
      "stockLengthInput": "Stock length input",
      "stockLengths": "Stock Lengths",
      "thicknessInput": "Thickness input",
      "thicknesses": "Thicknesses",
      "tolerance": "Tolerance",
      "topCutoffLimit": "Top Cutoff Limit",
      "typeDimensional": "Dimensional",
      "typeGeneric": "Generic",
      "typeSheet": "Sheet",
      "typeStrawbale": "Strawbale",
      "typeVolume": "Volume",
      "volumeInput": "Volume input"
    },
    "modal": {
      "tabFloors": "Floor Assemblies",
      "tabMaterials": "Materials",
      "tabOpenings": "Opening Assemblies",
      "tabRingBeams": "Ring Beam Assemblies",
      "tabRoofs": "Roof Assemblies",
      "tabWalls": "Wall Assemblies",
      "title": "Configuration"
    },
    "openings": {
      "configure": "Configure Opening Assembly",
      "copyNameTemplate": "{{name}} (Copy)",
      "defaultLabel": "{{label}} <gray>(default)</gray>",
      "defaultOpeningAssembly": "Default Opening Assembly",
      "defaults": {
        "emptyOpening": "Empty Opening",
        "standardOpening": "Standard Opening",
        "standardOpeningWithPosts": "Standard Opening with Posts"
      },
      "deleteConfirm": "Are you sure you want to delete \"{{name}}\"? This action cannot be undone.",
      "deleteTitle": "Delete Opening Assembly",
      "emptyList": "No opening assemblies available",
      "labels": {
        "headerMaterial": "Header Material",
        "headerThickness": "Header Thickness",
        "padding": "Padding",
        "replacesWallPosts": "Replaces Wall Posts",
        "sillMaterial": "Sill Material",
        "sillThickness": "Sill Thickness"
      },
      "placeholders": {
        "name": "Opening assembly name"
      },
      "postTypes": {
        "double": "Double",
        "full": "Full"
      },
      "resetConfirm": "Are you sure you want to reset default opening assemblies? This will restore the original default assemblies but keep any custom assemblies you've created. This action cannot be undone.",
      "resetTitle": "Reset Opening Assemblies",
      "sections": {
        "opening": "Opening",
        "posts": "Posts"
      },
      "types": {
        "empty": "Empty Opening",
        "post": "Opening With Posts",
        "simple": "Standard Opening"
      },
      "useGlobalDefault": "Use global default"
    },
    "ringBeams": {
      "configure": "Configure Ring Beam",
      "copyNameTemplate": "{{name}} (Copy)",
      "defaultBasePlate": "Default Base Plate",
      "defaultLabel": "{{label}} <gray>(default)</gray>",
      "defaultTopPlate": "Default Top Plate",
      "defaults": {
        "brickRingBeam": "Brick Ring Beam",
        "full36x6cm": "Full 36x6cm"
      },
      "deleteConfirm": "Are you sure you want to delete \"{{name}}\"? This action cannot be undone.",
      "deleteTitle": "Delete Ring Beam Assembly",
      "emptyList": "No ring beam assemblies available",
      "labels": {
        "offsetFromInsideEdge": "Offset from Inside Edge"
      },
      "newName_brick": "New Brick Assembly",
      "newName_double": "New Double Assembly",
      "newName_full": "New Full Assembly",
      "none": "None",
      "placeholders": {
        "name": "Ring beam assembly name"
      },
      "resetConfirm": "Are you sure you want to reset default ring beam assemblies? This will restore the original default assemblies but keep any custom assemblies you've created. This action cannot be undone.",
      "resetTitle": "Reset Ring Beam Assemblies",
      "sections": {
        "beam": "Beam",
        "insulation": "Insulation",
        "stemWall": "Stem Wall",
        "waterproofing": "Waterproofing"
      },
      "types": {
        "brick": "Brick Ring Beam",
        "double": "Double Ring Beam",
        "full": "Full Ring Beam"
      }
    },
    "roofs": {
      "addInsideLayer": "Add Inside Layer",
      "addOverhangLayer": "Add Overhang Layer",
      "addTopLayer": "Add Top Layer",
      "configure": "Configure Roof Assembly",
      "copyNameTemplate": "{{name}} (Copy)",
      "defaultLabel": "{{label}} <gray>(default)</gray>",
      "defaultRoofAssembly": "Default Roof Assembly",
      "defaults": {
        "cltMonolithic18cm": "CLT Monolithic 18cm",
        "purlinRoofStraw": "Purlin Roof (Straw)"
      },
      "deleteConfirm": "Are you sure you want to delete \"{{name}}\"? This action cannot be undone.",
      "deleteTitle": "Delete Roof Assembly",
      "emptyList": "No roof assemblies available",
      "finishedTop": "Finished Top",
      "labels": {
        "spacingMin": "Spacing (Min)",
        "spacingTarget": "Spacing (Target)"
      },
      "layers": {
        "insideLayers": "Inside Layers (Ceiling)",
        "overhangLayers": "Overhang Layers"
      },
      "newName": {
        "monolithic": "New Monolithic Roof",
        "purlin": "New Purlin Roof"
      },
      "noInsideLayers": "No inside layers defined",
      "noOverhangLayers": "No overhang layers defined (optional)",
      "noTopLayers": "No top layers defined",
      "outside": "Outside",
      "overhang": "Overhang",
      "resetConfirm": "Are you sure you want to reset default roof assemblies? This will restore the original default assemblies but keep any custom assemblies you've created. This action cannot be undone.",
      "resetTitle": "Reset Roof Assemblies",
      "roofConstruction": "Roof Construction",
      "sections": {
        "ceilingSheathing": "Ceiling Sheathing",
        "decking": "Decking",
        "monolithicConfiguration": "Monolithic Configuration",
        "purlins": "Purlins",
        "rafters": "Rafters",
        "straw": "Straw"
      },
      "topLayers": "Top Layers",
      "types": {
        "monolithic": "Monolithic",
        "purlin": "Purlin"
      }
    },
    "usage": {
      "globalDefault_floor": "Global Default",
      "globalDefault_opening": "Global Default",
      "globalDefault_ringBeamBase": "Global Default (Base Plate)",
      "globalDefault_ringBeamTop": "Global Default (Top Plate)",
      "globalDefault_roof": "Global Default",
      "globalDefault_straw": "Default Straw Material",
      "globalDefault_wall": "Global Default",
      "unknown": "Unknown",
      "usedBy": "Used By:",
      "usedInFloor": "Floor: {{label}}",
      "usedInOpening": "Opening: {{label}}",
      "usedInRingBeam": "Ring Beam: {{label}}",
      "usedInRoof": "Roof: {{label}}",
      "usedInStorey": "Storey: {{label}}",
      "usedInWall": "Wall: {{label}}",
      "usedInWallPosts": "Wall Posts"
    },
    "walls": {
      "addInsideLayer": "Add Inside Layer",
      "addOutsideLayer": "Add Outside Layer",
      "configure": "Configure Wall Assembly",
      "copyNameTemplate": "{{name}} (Copy)",
      "defaultLabel": "{{label}} <gray>(default)</gray>",
      "defaultWallAssembly": "Default Wall Assembly",
      "defaults": {
        "concreteWall": "Concrete Wall",
        "defaultModule": "Default Module",
        "standardInfill": "Standard Infill",
        "strawhengeModule": "Strawhenge Module"
      },
      "deleteConfirm": "Are you sure you want to delete \"{{name}}\"? This action cannot be undone.",
      "deleteTitle": "Delete Wall Assembly",
      "desiredPostSpacing": "Desired Post Spacing",
      "emptyList": "No wall assemblies available",
      "frameMaterial": "Frame Material",
      "frameThickness": "Frame Thickness",
      "frameWidth": "Frame Width",
      "infillConfiguration": "Infill Configuration",
      "infillMaterial": "Infill Material",
      "infillMaterialTooltip": "If configured, will be used for gaps which are too small for straw",
      "inside": "Inside",
      "insideLayers": "Inside Layers",
      "maxPostSpacing": "Max Post Spacing",
      "maxWidth": "Max Width",
      "minStrawSpace": "Min Straw Space",
      "minWidth": "Min Width",
      "moduleConfiguration": "Module Configuration",
      "moduleType": "Module Type",
      "moduleTypeDouble": "Double Frame",
      "moduleTypeSingle": "Single Frame",
      "newName_infill": "New Infill Assembly",
      "newName_modules": "New Modules Assembly",
      "newName_nonStrawbale": "New Non-Strawbale Assembly",
      "newName_strawhenge": "New Strawhenge Assembly",
      "noInfillMaterial": "No infill material",
      "noInsideLayers": "No inside layers defined",
      "noOutsideLayers": "No outside layers defined",
      "nonStrawbaleConfiguration": "Non-Strawbale Configuration",
      "openingAssembly": "Opening Assembly",
      "openingsSection": "Openings",
      "outside": "Outside",
      "outsideLayers": "Outside Layers",
      "postType": "Post Type",
      "postTypeDouble": "Double",
      "postTypeFull": "Full",
      "postsConfiguration": "Posts Configuration",
      "resetConfirm": "Are you sure you want to reset default wall assemblies? This will restore the original default assemblies but keep any custom assemblies you've created. This action cannot be undone.",
      "resetTitle": "Reset Wall Assemblies",
      "selectDefault": "Select default...",
      "spacerCount": "Spacer Count",
      "spacerMaterial": "Spacer Material",
      "spacerSize": "Spacer Size",
      "types": {
        "infill": "Infill",
        "modules": "Modules",
        "non-strawbale": "Non-Strawbale",
        "strawhenge": "Strawhenge"
      },
      "unclearTotalThickness": "? + {{layerThickness, length}} (Layers)",
      "wallConstruction": "Wall Construction"
    }
  },
  "construction": {
    "areaTypes": {
      "bottom-plate": "Bottom Ring Beam",
      "corner": "Corner",
      "door": "Door",
      "floor-level": "Finished Floor Level",
      "inner-perimeter": "Inner Perimeter",
      "outer-perimeter": "Outer Perimeter",
      "passage": "Passage",
      "top-plate": "Top Ring Beam",
      "window": "Window"
    },
    "materialSelect": {
      "noMaterialsAvailable": "No materials available",
      "none": "None",
      "placeholder": "Select material..."
    },
    "materialTypes": {
      "dimensional": "Dimensional",
      "generic": "Generic",
      "sheet": "Sheet",
      "strawbale": "Strawbale",
      "volume": "Volume"
    },
    "measurements": {
      "assembly": "Assembly",
      "basePlate": "Base Plate",
      "ceilingLayers": "Ceiling Layers",
      "construction": "Construction",
      "finishedCeiling": "Finished Ceiling",
      "finishedFloor": "Finished Floor",
      "finishedInside": "Finished Inside",
      "finishedOutside": "Finished Outside",
      "finishedOverhang": "Finished Overhang",
      "finishedRooftop": "Finished Rooftop",
      "floorAssembly": "Floor Assembly",
      "floorBottomLayers": "Floor Bottom Layers",
      "floorBottomOffset": "Construction Bottom Offset",
      "floorConstruction": "Floor Construction",
      "floorTopLayers": "Floor Top Layers",
      "floorTopOffset": "Construction Top Offset",
      "insideLayers": "Inside Layers",
      "measurements": "Measurements",
      "outsideLayers": "Outside Layers",
      "overhangLayers": "Overhang Layers",
      "roofAssembly": "Roof Assembly",
      "roofConstruction": "Roof Construction",
      "roofInsideOverlap": "Inside\nOverlap",
      "roofMeasurementDetails": "Roof Measurement Details",
      "roofOutsideOverlap": "Outside\nOverlap",
      "roofTopLayers": "Roof Top Layers",
      "roomHeight": "Ceiling Height",
      "storeyHeight": "Floor Height",
      "topPlate": "Top Plate",
      "totalFloorThickness": "Total\nFloor\nThickness",
      "totalRoofThickness": "Roof\nThickness",
      "totalWallThickness": "Total\nWall\nThickness",
      "wall": "Wall",
      "wallAssembly": "Wall Assembly",
      "wallAssemblyHeight": "Wall Assembly Height",
      "wallConstruction": "Wall Construction",
      "wallConstructionHeight": "Wall Construction Height"
    },
    "modulesList": {
      "actions": {
        "viewInPlan": "View in plan"
      },
      "noModules": "No modules",
      "tableHeaders": {
        "dimensions": "Dimensions",
        "label": "Label",
        "quantity": "Quantity",
        "type": "Type",
        "view": "View"
      },
      "title": "Modules"
    },
    "partCutModal": {
      "partCutDiagram": "Part Cut Diagram",
      "sheetPartDiagram": "Sheet Part Diagram"
    },
    "partsList": {
      "actions": {
        "backToSummary": "Back to summary",
        "configureMaterial": "Configure Material",
        "jumpToDetails": "Jump to details",
        "specialCutPreview": "Special cut polygon preview",
        "viewInPlan": "View in plan"
      },
      "groups": {
        "allParts": "All parts",
        "strawbales": "Strawbales"
      },
      "issues": {
        "dimensionsExceedSizeMultiple": "Dimensions exceed available sheet sizes. This part will require multiple sheets.",
        "dimensionsExceedSizeSingle": "Dimensions exceed available sheet sizes.",
        "dimensionsMismatchThickness": "Dimensions do not match available thicknesses",
        "groupMismatch": "This group does not match the defined material options",
        "lengthExceedsMultiple": "Part length exceeds maximum available length. This part will require multiple pieces.",
        "lengthExceedsSingle": "Part length exceeds maximum available length."
      },
      "noPartsAvailable": "No parts available.",
      "other": {
        "crossSectionMismatch": "Cross section does not match available options for this material",
        "crossSections": "Other cross sections",
        "thicknessMismatch": "Thickness does not match available options for this material",
        "thicknesses": "Other thicknesses"
      },
      "straw": {
        "flakes": "Flakes",
        "fullBales": "Full bales",
        "leftoverFromPartialBales": "Leftover from partial bales",
        "partialBales": "Partial bales",
        "rawLengthNote": "The given length is the raw length",
        "sawButtonHint": "Click the \"saw\" button to see more detailed measurements",
        "specialCutNote": "This part requires a special cut",
        "stuffedFill": "Stuffed fill"
      },
      "summary": "Summary",
      "tableHeaders": {
        "area": "Area",
        "baleCount": "Bale Count",
        "category": "Category",
        "description": "Description",
        "differentParts": "Different Parts",
        "dimensions": "Dimensions",
        "label": "Label",
        "length": "Length",
        "material": "Material",
        "quantity": "Qty",
        "thickness": "Thickness",
        "totalArea": "Total Area",
        "totalLength": "Total Length",
        "totalQuantity": "Total Quantity",
        "totalVolume": "Total Volume",
        "totalWeight": "Total Weight",
        "type": "Type",
        "view": "View"
      },
      "totalRow": "Total"
    },
    "partsListModal": {
      "errors": {
        "failedModulesList": "Failed to generate modules list",
        "failedPartsList": "Failed to generate parts list"
      },
      "tabs": {
        "materials": "Materials",
        "modules": "Modules"
      },
      "title": "Parts List"
    },
    "plan": {
      "hideAreas": "Hide Areas",
      "hideIssues": "Hide Issues",
      "hideMeasurements": "Hide Measurements",
      "midCut": "Mid Cut"
    },
    "planModal": {
      "errors": {
        "failedModel": "Failed to generate construction model",
        "failedModulesList": "Failed to generate modules list",
        "failedPartsList": "Failed to generate parts list"
      },
      "issuesPanel": {
        "errorsTitle_one": "Errors ({{count}})",
        "errorsTitle_other": "Errors ({{count}})",
        "noIssuesMessage": "Construction plan is valid with no errors or warnings.",
        "noIssuesTitle": "No Issues Found",
        "warningsTitle_one": "Warnings ({{count}})",
        "warningsTitle_other": "Warnings ({{count}})"
      },
      "partHighlight": {
        "clearHighlight": "Clear highlight",
        "partHighlighted": "Part highlighted"
      },
      "tabs": {
        "modules": "Modules",
        "partsList": "Parts List",
        "planIssues": "Plan & Issues"
      },
      "views": {
        "floor": "Floor",
        "roof": "Roof",
        "walls": "Walls"
      }
    },
    "strawCategories": {
      "flakes": "Flakes",
      "full": "Full bales",
      "partial": "Partial bales",
      "stuffed": "Stuffed fill"
    },
    "tagCategories": {
      "area": "Area",
      "construction": "Construction",
      "finished-measurement": "Finished Measurement",
      "floor-assembly": "Floor Assembly",
      "floor-layer": "Floor Layers",
      "floor-measurement": "Floor Measurement",
      "floor-part": "Floor Part",
      "module-part": "Module Parts",
      "opening": "Opening",
      "opening-measurement": "Opening Measurement",
      "ring-beam-assembly": "Ring Beam Assembly",
      "ring-beam-measurement": "Ring Beam Measurement",
      "ring-beam-part": "Ring Beam Part",
      "roof-assembly": "Roof Assembly",
      "roof-layer": "Roof Layers",
      "roof-measurement": "Roof Measurement",
      "roof-part": "Roof Parts",
      "roof-side": "Roof Side",
      "storey-name": "Storey Name",
      "straw": "Straw",
      "wall-assembly": "Wall Assembly",
      "wall-layer": "Wall Layers",
      "wall-measurement": "Wall Measurement",
      "wall-part": "Wall Wood"
    },
    "tagVisibility": {
      "hideCategory": "Hide Category",
      "noTags": "No tags available",
      "showCategory": "Show Category",
      "title": "Tag Visibility"
    },
    "tags": {
      "area_perimeter-inside": "Perimeter Inside",
      "area_perimeter-outside": "Perimeter Outside",
      "construction_base-plate": "Base Plate",
      "construction_floor": "Floor",
      "construction_layers": "Layers",
      "construction_module": "Module",
      "construction_roof": "Roof",
      "construction_storey": "Storey",
      "construction_top-plate": "Top Plate",
      "construction_walls": "Walls",
      "finished-measurement_wall-length-inside": "Wall Length Inside",
      "finished-measurement_wall-length-outside": "Wall Length Outside",
      "floor-assembly_filled": "Type: Filled",
      "floor-assembly_joist": "Type: Joist",
      "floor-assembly_monolithic": "Type: Monolithic",
      "floor-layer_bottom": "Ceiling Finish Layers",
      "floor-layer_top": "Floor Finish Layers",
      "floor-measurement_joist-length": "Joist Length",
      "floor-measurement_joist-spacing": "Joist Spacing",
      "floor-part_ceiling-sheathing": "Ceiling Sheathing",
      "floor-part_frame": "Frame",
      "floor-part_infill": "Wall Infill",
      "floor-part_joist": "Joist",
      "floor-part_opening-frame": "Opening Frame",
      "floor-part_subfloor": "Subfloor",
      "floor-part_wall-beam": "Wall Beam",
      "module-part_frame": "Frame",
      "module-part_infill": "Infill",
      "module-part_spacer": "Spacer",
      "opening-measurement_header-from-top": "Header From Top",
      "opening-measurement_header-height": "Header Height",
      "opening-measurement_opening-height": "Opening Height",
      "opening-measurement_opening-width": "Opening Width",
      "opening-measurement_sill-height": "Sill Height",
      "opening_door": "Door",
      "opening_window": "Window",
      "ring-beam-measurement_ring-beam-height": "Ring Beam Height",
      "ring-beam-measurement_ring-beam-inner": "Ring Beam Inner",
      "ring-beam-measurement_ring-beam-outer": "Ring Beam Outer",
      "ring-beam-part_insulation": "Insulation",
      "ring-beam-part_plate": "Plate",
      "ring-beam-part_stud-wall": "Stud Wall",
      "ring-beam-part_waterproofing": "Waterproofing Layer",
      "roof-assembly_monolithic": "Type: Monolithic",
      "roof-assembly_purlin": "Type: Purlin",
      "roof-layer_inside": "Ceiling Layers",
      "roof-layer_overhang": "Overhang Layers",
      "roof-layer_top": "Roof Top Layers",
      "roof-measurement_purlin-length": "Purlin Length",
      "roof-measurement_purlin-rise": "Purlin Rise",
      "roof-measurement_purlin-spacing": "Purlin Spacing",
      "roof-measurement_rafter-length": "Rafter Length",
      "roof-measurement_rafter-spacing": "Rafter Spacing",
      "roof-part_decking": "Decking",
      "roof-part_infill": "Infill",
      "roof-part_inside-sheathing": "Inside Sheathing",
      "roof-part_purlin": "Purlin",
      "roof-part_rafter": "Rafter",
      "roof-part_ridge-beam": "Ridge Beam",
      "roof-side_left": "Left Roof Side",
      "roof-side_right": "Right Roof Side",
      "straw_flakes": "Straw Flakes",
      "straw_full-bale": "Full Strawbale",
      "straw_infill": "Generic Straw Infill",
      "straw_partial-bale": "Partial Strawbale",
      "straw_stuffed": "Stuffed Straw",
      "wall-assembly_infill": "Type: Infill",
      "wall-assembly_non-strawbale": "Type: Non-Strawbale",
      "wall-assembly_strawhenge": "Type: Strawhenge",
      "wall-layer_inside": "Inside Wall Layers",
      "wall-layer_outside": "Outside Wall Layers",
      "wall-measurement_module-width": "Module Width",
      "wall-measurement_opening-spacing": "Opening Spacing",
      "wall-measurement_post-spacing": "Post Spacing",
      "wall-measurement_wall-construction-height": "Wall Construction Height",
      "wall-measurement_wall-construction-length-inside": "Wall Construction Length Inside",
      "wall-measurement_wall-construction-length-outside": "Wall Construction Length Outside",
      "wall-measurement_wall-height": "Wall Height",
      "wall-measurement_wall-length": "Wall Length",
      "wall-part_header": "Header",
      "wall-part_infill": "Infill",
      "wall-part_post": "Post",
      "wall-part_sill": "Sill"
    },
    "viewer3DModal": {
      "title": "3D Construction View"
    }
  },
  "errors": {
    "boundary": {
      "copyError": "Copy Error Details",
      "dataRecovery": {
        "cancel": "Cancel",
        "confirm": "Delete All Data & Reset",
        "description": "If the error persists, you can perform a hard reset that will clear all stored data and reset the application to its default state. This will delete your floor plans and configurations.",
        "dialogDescription": "This will delete all your data including floor plans, configurations, and materials. This action cannot be undone.",
        "dialogTitle": "Reset Application?",
        "hardReset": "Hard Reset Application",
        "title": "Data Recovery Option"
      },
      "description": "The application encountered an unexpected error and cannot continue.",
      "errorDetails": "Error Details:",
      "errorMessage": "An unexpected error occurred",
      "hideDetails": "Hide Details",
      "noStackTrace": "No stack trace available",
      "reloadPage": "Reload Page",
      "showDetails": "Show Details",
      "title": "Something went wrong",
      "tryAgain": "Try Again"
    },
    "construction": {
      "error": {
        "geometryProcessing": "An error occurred during geometry processing"
      },
      "infill": {
        "notEnoughSpaceForPost": "Not enough space for a post",
        "notEnoughSpaceForStraw": "Not enough space for infilling straw",
        "notEnoughSpaceForTwoPosts": "Space for more than one post, but not enough for two",
        "notEnoughVerticalSpace": "Not enough vertical space to fill with straw"
      },
      "layer": {
        "parallelLines": "Could not determine stripe positions due to parallel lines."
      },
      "opening": {
        "headerDoesNotFit": "Header does not fit: needs {{required, length}} but only {{available, length}} available",
        "heightExceedsWall": "Opening is higher than the wall by {{excess, length}}",
        "sillDoesNotFit": "Sill does not fit: needs {{required, length}} but only {{available, length}} available"
      },
      "post": {
        "crossSectionMismatch": "Cross section does not match available options for this material",
        "dimensionsMismatch": "Post dimensions ({{width, length}}×{{thickness, length}}) don't match available cross sections",
        "wallTooThin": "Wall thickness ({{wallThickness, length}}) is not wide enough for double posts requiring {{required, length}} minimum"
      },
      "ringBeam": {
        "doubleNotSupported": "Double ring beam construction is not yet supported."
      },
      "roof": {
        "invalidAssembly": "Invalid roof assembly"
      },
      "straw": {
        "tooThick": "Wall is too thick for a single strawbale",
        "tooThin": "Wall is too thin for a single strawbale"
      }
    },
    "feature": {
      "cancel": "Cancel",
      "confirm": "Delete All Data & Reset",
      "defaultMessage": "This feature encountered an error and cannot be displayed.",
      "dialogDescription": "This will delete all your data including floor plans, configurations, and materials. This action cannot be undone.",
      "dialogTitle": "Reset Application?",
      "hardReset": "Hard Reset Application",
      "reloadPage": "Reload Page",
      "retry": "Retry",
      "title": "Error"
    },
    "modal": {
      "defaultMessage": "This content could not be displayed due to an error.",
      "errorPrefix": "Error:",
      "retry": "Retry"
    }
  },
  "inspector": {
    "floorArea": {
      "area": "Area",
      "fitToView": "Fit to view",
      "notFound": "Floor area not found.",
      "perimeter": "Perimeter",
      "removeFloorArea": "Remove floor area"
    },
    "floorOpening": {
      "area": "Area",
      "fitToView": "Fit to view",
      "notFound": "Floor opening not found.",
      "perimeter": "Perimeter",
      "removeFloorOpening": "Remove floor opening"
    },
    "opening": {
      "confirmDelete": "Are you sure you want to remove this opening?",
      "deleteOpening": "Delete opening",
      "dimensionMode": "Dimension Mode",
      "dimensionModeFinished": "Finished",
      "dimensionModeFinishedTooltip": "Actual opening size (with fitting frame)",
      "dimensionModeFitting": "Fitting",
      "dimensionModeFittingTooltip": "Raw opening size (construction)",
      "fitToView": "Fit to view",
      "height": "Height",
      "moveInstructions": "To move the opening, you can use the Move Tool <kbd>{{hotkey}}</kbd> or click any of the distance measurements shown in the editor to adjust them.",
      "notFound": "Opening Not Found",
      "notFoundMessage": "Opening with ID {{id}} could not be found.",
      "openingAssembly": "Opening Assembly",
      "openingAssemblyTooltip": "Override the opening assembly for this specific opening. Leave as default to inherit from the wall assembly or global default.",
      "padding": "Padding",
      "sill": "Sill",
      "top": "Top",
      "type": "Type",
      "typeDoorTooltip": "Door",
      "typePassageTooltip": "Passage",
      "typeTooltip": "Opening types don't influence the construction yet but are rendered differently.",
      "typeWindowTooltip": "Window",
      "width": "Width"
    },
    "perimeter": {
      "addGableRoof": "Gable Roof",
      "addRoofBasedOnPerimeter": "Add roof based on perimeter",
      "addShedRoof": "Shed Roof",
      "basePlate": "Base Plate",
      "constructionPlanTitle": "Perimeter Construction Plan",
      "deletePerimeter": "Delete perimeter",
      "fitToView": "Fit to view",
      "mixedPlaceholder": "Mixed",
      "mixedValuesTooltip": "Different values across walls. Changing this will update all walls.",
      "nonRightAnglesDescription": "This perimeter contains corners with angles that are not multiples of 90°. Construction planning for such corners is not fully supported yet.",
      "nonRightAnglesWarning": "Non-right angles detected",
      "nonePlaceholder": "None",
      "notFound": "Perimeter Not Found",
      "notFoundMessage": "Perimeter with ID {{id}} could not be found.",
      "referenceSide": "Reference Side",
      "referenceSideInside": "Inside",
      "referenceSideOutside": "Outside",
      "ringBeams": "Ring Beams",
      "selectAssemblyPlaceholder": "Select assembly",
      "topPlate": "Top Plate",
      "totalInnerPerimeter": "Total Inner Perimeter",
      "totalInsideArea": "Total Inside Area",
      "totalOuterPerimeter": "Total Outer Perimeter",
      "totalOverbuiltArea": "Total Overbuilt Area",
      "view3DConstruction": "View 3D Construction",
      "viewAssociatedRoof": "View associated roof",
      "viewConstructionPlan": "View Construction Plan",
      "wallAssembly": "Wall Assembly",
      "wallConfiguration": "Wall Configuration",
      "wallThickness": "Wall Thickness"
    },
    "perimeterCorner": {
      "cannotDeleteMinCorners": "Cannot delete - perimeter needs at least 3 corners",
      "cannotDeleteSelfIntersect": "Cannot delete - would create self-intersecting polygon",
      "cannotSwitchTooltip": "Cannot switch - wall has posts in corner area",
      "constructionNotes": "Construction Notes",
      "cornerLockedDescription": "Cannot switch which wall constructs this corner because the current constructing wall has posts extending into the corner area. Remove those posts first to unlock corner switching.",
      "cornerLockedWarning": "Corner Locked",
      "deleteCorner": "Delete corner",
      "exteriorAngle": "Exterior Angle",
      "fitToView": "Fit to view",
      "geometry": "Geometry",
      "interiorAngle": "Interior Angle",
      "mergeSplit": "Merge split",
      "mixedAssembliesDescription": "Adjacent walls use different assembly types. Special attention may be needed at this corner.",
      "mixedAssembliesWarning": "Mixed Assemblies:",
      "nonRightAngleDescription": "Corners with angles that are not multiples of 90° are not fully supported yet. Construction details for this corner may require manual review and adjustments.",
      "nonRightAngleWarning": "Non-right angle",
      "notFound": "Corner Not Found",
      "notFoundMessage": "Corner with ID {{id}} could not be found.",
      "switchMainWall": "Switch main wall",
      "thicknessDifferenceDescription": "Adjacent walls have different thicknesses ({{difference}}mm difference).",
      "thicknessDifferenceWarning": "Thickness Difference:"
    },
    "perimeterWall": {
      "basePlate": "Base Plate",
      "cannotDeleteMinWalls": "Cannot delete - perimeter needs at least 3 walls",
      "cannotDeleteSelfIntersect": "Cannot delete - would create self-intersecting polygon",
      "constructionPlanTitle": "Wall Construction Plan",
      "constructionThickness": "Construction Thickness",
      "deleteWall": "Delete Wall",
      "doors": "Doors",
      "fitToView": "Fit to View",
      "insideLayersThickness": "Inside Layers Thickness",
      "insideLength": "Inside Length",
      "measurements": "Measurements",
      "nonePlaceholder": "None",
      "notFound": "Wall Not Found",
      "notFoundMessage": "Wall with ID {{id}} could not be found.",
      "openings": "Openings",
      "outsideLayersThickness": "Outside Layers Thickness",
      "outsideLength": "Outside Length",
      "passages": "Passages",
      "selectAssemblyPlaceholder": "Select wall assembly",
      "splitWall": "Split Wall",
      "thickness": "Thickness",
      "topPlate": "Top Plate",
      "viewConstructionPlan": "View Construction Plan",
      "viewInside": "Inside",
      "viewOutside": "Outside",
      "viewTop": "Top",
      "wallAssembly": "Wall Assembly",
      "windows": "Windows"
    },
    "roof": {
      "area": "Area",
      "assembly": "Assembly",
      "constructionPlanTitle": "Roof Construction Plan",
      "cycleMainSide": "Cycle main side (changes roof direction)",
      "fitToView": "Fit to view",
      "mixedPlaceholder": "Mixed",
      "mixedValuesTooltip": "Different values across sides. Changing this will update all sides.",
      "mixedWarning": "Select individual overhang sides to edit them separately",
      "notFound": "Roof not found.",
      "overhang": "Overhang",
      "perimeter": "Perimeter",
      "removeRoof": "Remove roof",
      "slope": "Slope",
      "type": "Type",
      "typeGable": "Gable",
      "typeShed": "Shed",
      "verticalOffset": "Vertical Offset",
      "view3DConstruction": "View 3D Construction",
      "viewAssociatedPerimeter": "View associated perimeter",
      "viewConstructionPlan": "View Construction Plan",
      "viewFront": "Front",
      "viewLeft": "Left",
      "viewTop": "Top"
    },
    "roofOverhang": {
      "fitToView": "Fit to view",
      "notFound": "Overhang Not Found",
      "overhang": "Overhang",
      "title": "Roof Overhang - Side {{side}}"
    },
    "storey": {
      "ceilingHeight": "Ceiling Height",
      "constructionWallArea": "Construction Wall Area",
      "doorArea": "Door Area",
      "exteriorWallArea": "Exterior Wall Area",
      "finishedWallArea": "Finished Wall Area",
      "floorHeight": "Floor Height",
      "footprint": "Footprint",
      "noPerimeters": "No perimeters have been added to this storey yet.",
      "notFound": "Storey Not Found",
      "notFoundMessage": "Storey with ID {{id}} could not be found.",
      "surfaceAreaToVolumeRatio": "Surface-area-to-volume ratio (SA:V)",
      "totalVolume": "Total Volume",
      "usableFloorArea": "Usable Floor Area (GFA)",
      "wallToWindowRatio": "Wall-to-window ratio (WWR)",
      "windowArea": "Window Area"
    },
    "wallPost": {
      "actsAsPost": "Acts as Post",
      "behavior": "Behavior",
      "confirmDelete": "Are you sure you want to remove this post?",
      "deletePost": "Delete post",
      "fitToView": "Fit to view",
      "flankedByPosts": "Flanked by Posts",
      "infillMaterial": "Infill Material",
      "moveInstructions": "To move the post, you can use the Move Tool <kbd>{{hotkey}}</kbd> or click any of the distance measurements shown in the editor to adjust them.",
      "notFound": "Post Not Found",
      "notFoundMessage": "Post with ID {{id}} could not be found.",
      "postMaterial": "Post Material",
      "thickness": "Thickness",
      "type": "Type",
      "typeCenter": "Center",
      "typeDouble": "Double",
      "typeInside": "Inside",
      "typeOutside": "Outside",
      "width": "Width"
    }
  },
  "overlay": {
    "canvas": {
      "resetView": "Reset view",
      "scrollToZoom": "Scroll to zoom",
      "uploadToBegin": "Upload an image to begin"
    },
    "planControls": {
      "ariaLabel": "Plan Overlay",
      "confirmRemove": {
        "cancel": "Cancel",
        "confirm": "Remove",
        "description": "Remove the plan image for {{floor}}? This cannot be undone.",
        "title": "Remove plan image"
      },
      "importPlan": "Import plan image",
      "label": "Plan Overlay",
      "placement": {
        "showOnTop": "Show on top",
        "showUnder": "Show under layout"
      },
      "recalibrate": "Recalibrate",
      "removePlan": "Remove plan"
    },
    "planImport": {
      "footer": {
        "addPlan": "Add plan",
        "cancel": "Cancel",
        "replacePlan": "Replace plan",
        "storageNote": "The plan image is only stored in your browser for this floor."
      },
      "step1": {
        "currentImage": "Using current image ({{name}}). Upload a new file below to replace it.",
        "title": "1. Select floor plan image",
        "uploadHint": "Upload a PNG, JPG, or SVG. The file stays local and is not saved with your project."
      },
      "step2": {
        "clearPoints": "Clear points",
        "instructions": "Pick two points with a known distance directly on the image.",
        "pixelDistance": "Pixel distance:",
        "pixelDistancePlaceholder": "Select two points",
        "realDistance": "Real Distance:",
        "scale": "Scale:",
        "scalePlaceholder": "Waiting for calibration",
        "scaleValue": "{{distance}} per px",
        "title": "2. Calibrate scale",
        "warningSmallSpan": "Calibration span is small – consider selecting points farther apart for better accuracy."
      },
      "step3": {
        "changeOrigin": "Change origin point",
        "clearOrigin": "Clear origin point",
        "clickHint": "Click on the image to set origin",
        "clickImage": "Click image…",
        "instructions": "Pick a point on the image that should align with the origin in the editor. If you skip this step, the first reference point becomes the origin.",
        "pickHint": "Pick origin on the image",
        "pickOrigin": "Pick origin on image",
        "title": "3. Position origin (optional)"
      },
      "titleExisting": "Plan image",
      "titleNew": "Import plan image"
    }
  },
  "tool": {
    "addOpening": {
      "copyConfigurationTooltip": "Copy this configuration",
      "dimensionMode": "Dimension Mode",
      "dimensionModeFinished": "Finished",
      "dimensionModeFinishedTooltip": "Actual finished door/window size",
      "dimensionModeFitting": "Fitting",
      "dimensionModeFittingTooltip": "Rough size in the construction, with padding for mounting",
      "height": "Height",
      "info": "Click on a wall to place an opening. Configure type, size, position, and assembly before placement.",
      "openingAssembly": "Opening Assembly",
      "openingAssemblyTooltip": "Override the opening assembly for this specific opening. Leave as default to inherit from the wall assembly or global default.",
      "openingType": "Opening Type",
      "padding": "Padding",
      "presets": {
        "buttonLabel": "{{label}}: {{width, length}} × {{height, length}}",
        "buttonLabel_sill": "{{label}}: {{width, length}} × {{height, length}} sill: {{sillHeight, length}}",
        "doubleDoor": "Double Door",
        "floorWindow": "Floor Window",
        "smallWindow": "Small Window",
        "standardDoor": "Standard Door",
        "standardWindow": "Standard Window",
        "title": "Presets",
        "wideDoor": "Wide Door"
      },
      "sill": "Sill",
      "top": "Top",
      "typeDoor": "Door",
      "typePassage": "Passage",
      "typeWindow": "Window",
      "width": "Width"
    },
    "addPost": {
      "actsAsPost": "Acts as Post",
      "behavior": "Behavior",
      "copyConfigurationTooltip": "Copy this configuration",
      "copyLabel": "{{type}} • {{width, length}}×{{thickness, length}}",
      "flankedByPosts": "Flanked by Posts",
      "infillMaterial": "Infill Material",
      "info": "Click on a wall to place a post. Configure dimensions, type, position, and materials before placement.",
      "postMaterial": "Post Material",
      "presets": {
        "double14x14": "14×14cm Double",
        "double6x12": "6×12cm Double",
        "single14x14": "14×14cm Single",
        "single6x36": "6×36cm Single",
        "title": "Presets"
      },
      "thickness": "Thickness",
      "type": "Type",
      "types": {
        "center": "Center",
        "double": "Double",
        "inside": "Inside",
        "outside": "Outside"
      },
      "width": "Width"
    },
    "floorArea": {
      "cancelLabel": "Cancel",
      "completeLabel": "Complete Floor Area",
      "description": "Click to outline the floor area on the active storey. Snap to perimeter corners or existing floor edges for precise alignment.",
      "title": "Floor Area"
    },
    "floorOpening": {
      "cancelLabel": "Cancel",
      "completeLabel": "Complete Floor Opening",
      "description": "Draw an opening within an existing floor area. Use snapping to align with floor edges or other openings.",
      "title": "Floor Opening"
    },
    "keyboard": {
      "enter": "Enter",
      "esc": "Esc"
    },
    "move": {
      "controlCancel": "Press {{key}} to cancel ongoing movement",
      "controlDrag": "Click and drag to move entities",
      "controlPrecise": "After moving, type numbers for precise distance",
      "controlSnap": "Movement snaps to grid and geometry",
      "controlsHeading": "Controls:",
      "info": "Drag entities to move them. After releasing, you can type a number to adjust the movement distance precisely.",
      "invalidPosition": "Invalid position",
      "moving": "Moving..."
    },
    "perimeter": {
      "basePlate": "Base Plate",
      "cancelPerimeter": "✕ Cancel Perimeter",
      "cancelTooltip": "Cancel perimeter creation (Escape)",
      "clearLengthOverride": "Clear length override (Escape)",
      "completePerimeter": "✓ Complete Perimeter",
      "completeTooltip": "Complete perimeter (Enter)",
      "controlClickFirst": "Click first point to close",
      "controlEnter": "{{key}} to close perimeter",
      "controlEscAbort": "{{key}} to abort perimeter",
      "controlEscOverride": "{{key}} to clear override",
      "controlNumbers": "Type numbers to set exact wall length",
      "controlPlace": "Click to place corner points",
      "controlSnap": "Points snap to grid and existing geometry",
      "controlsHeading": "Controls:",
      "infoInside": "Draw the {{edge}} of your building perimeter. Click to place points, and close the shape by clicking the first point or pressing Enter.",
      "insideEdge": "inside edge",
      "lengthOverride": "Length Override",
      "nonePlaceholder": "None",
      "outsideEdge": "outside edge",
      "referenceSide": "Reference Side",
      "referenceSideInside": "Inside",
      "referenceSideOutside": "Outside",
      "topPlate": "Top Plate",
      "wallAssembly": "Wall Assembly",
      "wallThickness": "Wall Thickness"
    },
    "perimeterPreset": {
      "info": "Presets create common building shapes with the reference edge you choose. Switch between inside or outside dimensions and configure construction properties.",
      "types": {
        "lshaped": "L-Shaped Perimeter",
        "rectangular": "Rectangular Perimeter"
      }
    },
    "presetDialogs": {
      "lShaped": {
        "basePlate": "Base Plate",
        "cancel": "Cancel",
        "configuration": "Configuration",
        "confirm": "Confirm",
        "extensionRectangle": "Extension Rectangle",
        "inside": "Inside",
        "invalidConfig": "Invalid configuration",
        "length1": "Length 1",
        "length2": "Length 2",
        "mainRectangle": "Main Rectangle",
        "none": "None",
        "outside": "Outside",
        "preview": "Preview",
        "referenceSide": "Reference Side",
        "rotation": "Rotation",
        "selectAssembly": "Select assembly",
        "title": "L-Shaped Perimeter",
        "topPlate": "Top Plate",
        "wallAssembly": "Wall Assembly",
        "wallThickness": "Wall Thickness",
        "width1": "Width 1",
        "width2": "Width 2"
      },
      "rectangular": {
        "basePlate": "Base Plate",
        "cancel": "Cancel",
        "configuration": "Configuration",
        "confirm": "Confirm",
        "inside": "Inside",
        "length": "Length",
        "none": "None",
        "outside": "Outside",
        "preview": "Preview",
        "referenceSide": "Reference Side",
        "selectAssembly": "Select assembly",
        "title": "Rectangular Perimeter",
        "topPlate": "Top Plate",
        "wallAssembly": "Wall Assembly",
        "wallThickness": "Wall Thickness",
        "width": "Width"
      }
    },
    "roof": {
      "assembly": "Assembly",
      "cancelRoof": "✕ Cancel Roof",
      "cancelTooltip": "Cancel roof creation (Escape)",
      "completeRoof": "✓ Complete Roof",
      "completeTooltip": "Complete roof (Enter)",
      "controlClickFirst": "Click first point to close",
      "controlEnter": "{{key}} to close roof",
      "controlEsc": "{{key}} to abort roof",
      "controlPlace": "Click to place corner points",
      "controlSnap": "Points snap to perimeter edges and other geometry",
      "controlsHeading": "Controls:",
      "info": "Draw the roof outline by clicking to place points. The roof direction will be perpendicular to the first edge.",
      "overhang": "Overhang",
      "slope": "Slope",
      "type": "Type",
      "typeGable": "Gable",
      "typeShed": "Shed",
      "verticalOffset": "Vertical Offset"
    },
    "select": {
      "unknownEntityMessage": "Entity id not recognized: {{id}}",
      "unknownEntityType": "Unknown Entity Type"
    },
    "simplePolygon": {
      "cancelDrawing": "Cancel drawing (Escape)",
      "clearLengthOverride": "Clear length override (Escape)",
      "completeShape": "Complete shape (Enter)",
      "controlEnter": "{{key}} to complete shape",
      "controlEscCancel": "{{key}} to cancel drawing",
      "controlEscOverride": "{{key}} to clear length override",
      "controlNumbers": "Type numbers to set exact segment lengths",
      "controlPlace": "Click to place polygon points",
      "controlSnap": "Points snap to grid, perimeters, and existing geometry",
      "controlsHeading": "Controls:",
      "lengthOverride": "Length Override"
    },
    "splitWall": {
      "cancel": "Cancel",
      "controlClick": "Click to set split position",
      "controlConfirm": "Press Enter to confirm split",
      "controlHover": "Hover over wall to preview split position",
      "controlMeasurements": "Click measurements to enter precise values",
      "errors": {
        "intersectsOpening": "Split position intersects with an opening",
        "noWall": "No wall selected",
        "outOfBounds": "Split position is not inside the bounds of the wall"
      },
      "info": "Split walls to create segments with different wall assemblies or to position openings precisely.",
      "readyToSplit": "Ready to split wall",
      "selectWall": "Click on a wall to select it for splitting",
      "splitWall": "Split Wall",
      "title": "Split Wall"
    },
    "testData": {
      "confirmReset": "Are you sure you want to reset all data? This will clear all perimeters, openings, and saved work.",
      "crossShaped": "📐 Cross/T-Shape Perimeter",
      "dangerZone": "⚠️ Danger Zone",
      "generationHeading": "Test Data Generation",
      "hardReset": "Hard Reset",
      "hexagonal": "⬡ Hexagonal Perimeter (3m sides)",
      "instructions": "Click any button above to generate test data or reset the model. Each test case creates a perimeter with realistic windows and doors to demonstrate the application features.",
      "rectangular": "▭ Rectangular Perimeter (8×5m)",
      "resetAll": "🗑️ Reset All Data",
      "resetWarning": "⚠️ This will permanently clear all perimeters, openings, and saved work"
    }
  },
  "toolbar": {
    "about": "About",
    "configuration": "Configuration",
    "constructionPlanForActiveStorey": "Construction Plan for active storey",
    "constructionPlanForStorey": "Construction Plan for {{storeyName}}",
    "gridSizeDisplay": {
      "hideGrid": "Hide Grid",
      "off": "Off",
      "showGrid": "Show Grid"
    },
    "groups": {
      "basic": "Basic",
      "floors": "Floors",
      "perimeter": "Perimeter",
      "roofs": "Roofs",
      "test": "Test Data"
    },
    "offlineStatus": {
      "loading": "Caching assets ({{loaded}}/{{total}})…",
      "loadingUnknown": "Preparing offline experience…",
      "offline": "Offline. Changes will sync once connection returns.",
      "ready": "All assets cached. Ready for offline use."
    },
    "partsListForEntireModel": "Parts List for Entire Model",
    "themeToggle": {
      "switchToDark": "Switch to dark mode",
      "switchToLight": "Switch to light mode"
    },
    "tools": {
      "basic.fit-to-view": "Fit to View",
      "basic.move": "Move",
      "basic.select": "Select",
      "floors.add-area": "Floor Area",
      "floors.add-opening": "Floor Opening",
      "perimeter.add": "Building Perimeter",
      "perimeter.add-opening": "Add Opening",
      "perimeter.add-post": "Add Post",
      "perimeter.preset": "Perimeter Presets",
      "perimeter.split-wall": "Split Wall",
      "roofs.add-roof": "Roof",
      "test.data": "Test Data"
    },
    "view3DConstruction": "View 3D Construction",
    "viewConstructionPlan": "View Construction Plan",
    "viewPartsList": "View Parts List"
  },
  "viewer": {
    "export": {
      "collada": "Collada (DAE)",
      "gltf": "GLTF",
      "ifc": "IFC",
      "obj": "OBJ",
      "stl": "STL",
      "title": "Export"
    },
    "grid": {
      "hide": "Hide Grid",
      "show": "Show Grid"
    },
    "tagOpacity": {
      "fullCategory": "Full Category",
      "hideCategory": "Hide Category",
      "noTags": "No tags available",
      "semiCategory": "Semi Category",
      "title": "Tag Opacity"
    }
  },
  "welcome": {
    "continueButton": "I Understand & Continue",
    "demoVideo": {
      "demo01": "Demo 0.1",
      "demo02": "Demo 0.2",
      "description": "Watch a quick demonstration of Strawbaler's features on YouTube:",
      "title": "Demo Video"
    },
    "disclaimer": {
      "intro": "This tool is currently in active development and provided as-is:",
      "items": ["No guarantees for accuracy of calculations, plans, or 3D models", "Breaking changes may occur between versions", "Project data may be lost due to browser storage limitations or updates", "Always save and export your work regularly", "This tool does not replace professional engineering consultation"],
      "title": "Important Disclaimer"
    },
    "introduction": "This is a tool specifically designed for strawbale construction planning. Create floor plans with walls, openings, roof and floors. Configure the construction and generate plans and 3D models. Get estimates for required materials. Export construction for use in other CAD tools.",
    "keyFeatures": {
      "items": ["Define perimeter walls in finished dimensions (with plasters) with windows and doors", "Add gable or shed roofs", "Configure your wall, floor and roof assembly (infill, strawhenge, modules)", "Generate 2D construction plans for invdividual walls or whole floors", "View and export 3D models of the construction (IFC)", "Get an overview of materials used in the construction"],
      "title": "Key Features"
    },
    "localStorage": {
      "description": "This application stores data locally in your browser to:",
      "items": ["Remember that you've seen this welcome message", "Save your floor plans and projects", "Preserve your configuration preferences"],
      "privacy": "No cookies, tracking, or third-party analytics are used.",
      "title": "Local Storage"
    },
    "plannedFeatures": {
      "items": ["Cost and work hours estimations", "Support for intermediate walls and foundations", "Translation in more languages", "Support for more irregular building shapes", "Support for multiple projects"],
      "title": "Planned Features"
    },
    "reviewInfo": "You can review this information anytime via the info icon in the toolbar",
    "version": "Version {{version}}",
    "viewOnGitHub": "View on GitHub"
  }
}

export default Resources;

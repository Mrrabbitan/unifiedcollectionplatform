export interface TableFieldMapper {
  sourceTable: string;
  fieldMapper: Record<string, string>;
}

export interface FieldMappingConfig {
  tableMappers: TableFieldMapper[];
}

export interface FieldMappingItem {
  sourceField: string;
  targetField: string;
  targetFieldType?: string;
}

export function createEmptyFieldMappingConfig(): FieldMappingConfig {
  return {
    tableMappers: [],
  };
}

export function createTableFieldMapper(
  sourceTable: string,
  fieldMapper?: Record<string, string>,
): TableFieldMapper {
  return {
    sourceTable,
    fieldMapper: fieldMapper || {},
  };
}

export function fieldMappingMapToArray(
  sourceTable: string,
  fieldMapping: Map<string, string>,
): TableFieldMapper {
  const fieldMapper: Record<string, string> = {};
  fieldMapping.forEach((value, key) => {
    fieldMapper[key] = value;
  });
  return {
    sourceTable,
    fieldMapper,
  };
}

export function fieldMappingArrayToMap(
  tableMapper: TableFieldMapper,
): Map<string, string> {
  const fieldMapping = new Map<string, string>();
  if (tableMapper.fieldMapper) {
    Object.entries(tableMapper.fieldMapper).forEach(([key, value]) => {
      fieldMapping.set(key, value);
    });
  }
  return fieldMapping;
}

export function buildFieldMappingRequest(
  tableMappers: TableFieldMapper[],
): TableFieldMapper[] {
  return tableMappers.map((mapper) => ({
    sourceTable: mapper.sourceTable,
    fieldMapper: { ...mapper.fieldMapper },
  }));
}

export function parseFieldMappingResponse(
  data: TableFieldMapper[] | FieldMappingItem[] | Record<string, string>,
  defaultSourceTable?: string,
): FieldMappingConfig {
  if (!data) {
    return createEmptyFieldMappingConfig();
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return createEmptyFieldMappingConfig();
    }

    const firstItem = data[0];
    if ('sourceTable' in firstItem && 'fieldMapper' in firstItem) {
      return {
        tableMappers: data as TableFieldMapper[],
      };
    }

    if ('sourceField' in firstItem && 'targetField' in firstItem) {
      const fieldMapper: Record<string, string> = {};
      (data as FieldMappingItem[]).forEach((item) => {
        fieldMapper[item.sourceField] = item.targetField;
      });
      return {
        tableMappers: [
          {
            sourceTable: defaultSourceTable || '',
            fieldMapper,
          },
        ],
      };
    }
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    const fieldMapper = data as Record<string, string>;
    return {
      tableMappers: [
        {
          sourceTable: defaultSourceTable || '',
          fieldMapper,
        },
      ],
    };
  }

  return createEmptyFieldMappingConfig();
}

export function mergeFieldMappings(
  configs: FieldMappingConfig[],
): FieldMappingConfig {
  const merged: FieldMappingConfig = createEmptyFieldMappingConfig();
  const tableMap = new Map<string, Record<string, string>>();

  configs.forEach((config) => {
    config.tableMappers.forEach((mapper) => {
      if (!tableMap.has(mapper.sourceTable)) {
        tableMap.set(mapper.sourceTable, {});
      }
      const existingMapper = tableMap.get(mapper.sourceTable)!;
      Object.assign(existingMapper, mapper.fieldMapper);
    });
  });

  tableMap.forEach((fieldMapper, sourceTable) => {
    merged.tableMappers.push({ sourceTable, fieldMapper });
  });

  return merged;
}

const fs = require('node:fs/promises');
const path = require('node:path');

const { compileFromFile } = require('json-schema-to-typescript');

const REPOSITORY_ROOT = path.resolve(__dirname, '..');
const DEFAULT_SCHEMA_DIRECTORY = path.join(REPOSITORY_ROOT, 'src', 'schemas');
const DEFAULT_OUTPUT_DIRECTORY = path.join(
  REPOSITORY_ROOT,
  'src',
  'types',
  'generated',
);
const DEFAULT_PUBLIC_TYPES_PATH = path.join(
  DEFAULT_OUTPUT_DIRECTORY,
  'public.ts',
);
const DEFAULT_SCHEMA_REGISTRY_PATH = path.join(
  DEFAULT_SCHEMA_DIRECTORY,
  'registry.ts',
);

const BANNER_COMMENT = `/* eslint-disable */\n/**\n * This file was automatically generated from the JSON schemas.\n * DO NOT MODIFY IT BY HAND. Instead, update the source schema and rerun\n * npm run generate:types.\n */`;

const ANNOTATION_KEYS = new Set([
  '$schema',
  '$id',
  'title',
  'description',
  '$comment',
  'examples',
  'default',
  'deprecated',
]);

function parseArguments(argv) {
  let outputDirectory = DEFAULT_OUTPUT_DIRECTORY;
  let schemaDirectory = DEFAULT_SCHEMA_DIRECTORY;
  let publicTypesPath = DEFAULT_PUBLIC_TYPES_PATH;
  let schemaRegistryPath = DEFAULT_SCHEMA_REGISTRY_PATH;

  let index = 0;
  while (index < argv.length) {
    const argument = argv[index];
    const nextValue = argv[index + 1];

    if (
      argument === '--output-dir' ||
      argument === '--schema-dir' ||
      argument === '--public-types-path' ||
      argument === '--schema-registry-path'
    ) {
      if (!nextValue) {
        throw new Error(`Missing value for ${argument}`);
      }

      if (argument === '--output-dir') {
        outputDirectory = path.resolve(nextValue);
      } else if (argument === '--schema-dir') {
        schemaDirectory = path.resolve(nextValue);
      } else if (argument === '--public-types-path') {
        publicTypesPath = path.resolve(nextValue);
      } else {
        schemaRegistryPath = path.resolve(nextValue);
      }

      index += 2;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return {
    outputDirectory,
    publicTypesPath,
    schemaDirectory,
    schemaRegistryPath,
  };
}

function toPascalCase(value) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join('');
}

function toCamelCase(value) {
  const pascalCaseValue = toPascalCase(value);
  return pascalCaseValue[0].toLowerCase() + pascalCaseValue.slice(1);
}

async function listSchemaFiles(schemaDirectory) {
  const directoryEntries = await fs.readdir(schemaDirectory, {
    withFileTypes: true,
  });

  const schemaFiles = directoryEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.schema.json'))
    .map((entry) => entry.name)
    .sort((left, right) => {
      if (left === 'core.schema.json') {
        return -1;
      }
      if (right === 'core.schema.json') {
        return 1;
      }
      return left.localeCompare(right);
    });

  if (!schemaFiles.includes('core.schema.json')) {
    throw new Error('Expected src/schemas to contain core.schema.json');
  }

  return schemaFiles;
}

async function loadSchemaRecords(schemaDirectory) {
  const schemaFiles = await listSchemaFiles(schemaDirectory);

  return Promise.all(
    schemaFiles.map(async (fileName) => {
      const schemaPath = path.join(schemaDirectory, fileName);
      const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
      const baseName = fileName.replace(/\.schema\.json$/, '');

      return {
        baseName,
        fileName,
        importName: `${toCamelCase(baseName)}Schema`,
        outputFileName: `${baseName}.ts`,
        schema,
        schemaId: typeof schema.$id === 'string' ? schema.$id : fileName,
        typeName: toPascalCase(baseName),
      };
    }),
  );
}

function normalizeAllOf(schema) {
  if (Array.isArray(schema)) {
    return schema.map(normalizeAllOf);
  }

  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const normalizedEntries = Object.entries(schema).map(([key, value]) => [
    key,
    normalizeAllOf(value),
  ]);
  const normalized = Object.fromEntries(normalizedEntries);

  if (!Array.isArray(normalized.allOf)) {
    return normalized;
  }

  const structuralEntries = [];
  const annotationEntries = [];

  for (const [key, value] of Object.entries(normalized)) {
    if (key === 'allOf') {
      continue;
    }

    if (ANNOTATION_KEYS.has(key)) {
      annotationEntries.push([key, value]);
      continue;
    }

    structuralEntries.push([key, value]);
  }

  if (structuralEntries.length === 0) {
    return normalized;
  }

  return Object.fromEntries([
    ...annotationEntries,
    [
      'allOf',
      [...normalized.allOf, Object.fromEntries(structuralEntries)],
    ],
  ]);
}

function localizeSchemaReferences(schema, currentFileName, schemaIdToFileName) {
  if (Array.isArray(schema)) {
    return schema.map((item) =>
      localizeSchemaReferences(item, currentFileName, schemaIdToFileName),
    );
  }

  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const localized = {};

  for (const [key, value] of Object.entries(schema)) {
    if (key === '$id' && typeof value === 'string') {
      localized[key] = schemaIdToFileName.get(value) ?? value;
      continue;
    }

    if (key === '$ref' && typeof value === 'string') {
      let rewrittenReference = value;

      for (const [schemaId, fileName] of schemaIdToFileName.entries()) {
        if (!value.startsWith(schemaId)) {
          continue;
        }

        const fragment = value.slice(schemaId.length);
        rewrittenReference =
          fileName === currentFileName
            ? fragment.length > 0
              ? fragment
              : '#'
            : `./${fileName}${fragment}`;
        break;
      }

      localized[key] = rewrittenReference;
      continue;
    }

    localized[key] = localizeSchemaReferences(value, currentFileName, schemaIdToFileName);
  }

  return localized;
}

async function createTemporarySchemaDirectory(schemaRecords) {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(require('node:os').tmpdir(), 'json-schema-types-'),
  );
  const schemaIdToFileName = new Map(
    schemaRecords.map((schemaRecord) => [schemaRecord.schemaId, schemaRecord.fileName]),
  );

  await Promise.all(
    schemaRecords.map(async (schemaRecord) => {
      const preparedSchema = localizeSchemaReferences(
        normalizeAllOf(schemaRecord.schema),
        schemaRecord.fileName,
        schemaIdToFileName,
      );

      await fs.writeFile(
        path.join(temporaryDirectory, schemaRecord.fileName),
        `${JSON.stringify(preparedSchema, null, 2)}\n`,
      );
    }),
  );

  return temporaryDirectory;
}

async function writeGeneratedFile(filePath, contents) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents);
}

async function compileCoreTypes(temporaryDirectory, outputDirectory) {
  const coreTypes = await compileFromFile(
    path.join(temporaryDirectory, 'core.schema.json'),
    {
      bannerComment: BANNER_COMMENT,
      cwd: temporaryDirectory,
      unreachableDefinitions: true,
    },
  );

  await writeGeneratedFile(path.join(outputDirectory, 'core.ts'), coreTypes);
}

function findTypeConst(schema) {
  const typeDefinition =
    schema && typeof schema === 'object' && schema.properties && schema.properties.type;

  if (
    typeDefinition &&
    typeof typeDefinition === 'object' &&
    !Array.isArray(typeDefinition) &&
    typeof typeDefinition.const === 'string'
  ) {
    return typeDefinition.const;
  }

  return null;
}

function hasPayloadProperty(schema) {
  return Boolean(
    schema &&
      typeof schema === 'object' &&
      schema.properties &&
      typeof schema.properties === 'object' &&
      !Array.isArray(schema.properties) &&
      schema.properties.payload,
  );
}

async function compileEventTypes(temporaryDirectory, outputDirectory, schemaRecord) {
  const generatedTypes = await compileFromFile(
    path.join(temporaryDirectory, schemaRecord.fileName),
    {
      bannerComment: BANNER_COMMENT,
      cwd: temporaryDirectory,
      declareExternallyReferenced: false,
      customName: (schema, fallbackName) =>
        schema.$id === schemaRecord.fileName ? schemaRecord.typeName : fallbackName,
    },
  );

  const output = `import type {EventPayload, GitHubEvent} from "./core";\n\n${generatedTypes.trim()}\n\nexport type ${schemaRecord.typeName}Payload = ${schemaRecord.typeName}["payload"];\n`;

  await writeGeneratedFile(
    path.join(outputDirectory, schemaRecord.outputFileName),
    output,
  );
}

function createPublicTypesSource(schemaRecords, outputDirectory) {
  const eventSchemaRecords = schemaRecords.filter(
    (schemaRecord) => schemaRecord.fileName !== 'core.schema.json',
  );

  const lines = [
    BANNER_COMMENT,
    '',
    'export type {Actor, EventPayload, EventPayload as BasePayload, GitHubEvent, Organization, Repository, Repository as Repo, User} from "./core";',
  ];

  if (eventSchemaRecords.length > 0) {
    lines.push('');
  }

  for (const schemaRecord of eventSchemaRecords) {
    const importPath = `./${path.basename(schemaRecord.outputFileName, '.ts')}`;
    const payloadTypeName = `${schemaRecord.typeName}Payload`;
    const typeConst = findTypeConst(schemaRecord.schema);
    const hasPayload = hasPayloadProperty(schemaRecord.schema);
    const importSpecifiers = [
      `${schemaRecord.typeName} as Generated${schemaRecord.typeName}`,
    ];

    if (hasPayload) {
      importSpecifiers.push(payloadTypeName);
    }

    lines.push(
      `import type {${importSpecifiers.join(', ')}} from "${importPath}";`,
    );

    if (hasPayload) {
      lines.push(`export type {${payloadTypeName}} from "${importPath}";`);
    }

    const overrideProperties = [];
    if (typeConst) {
      overrideProperties.push(`type: ${JSON.stringify(typeConst)};`);
    }
    if (hasPayload) {
      overrideProperties.push(`payload: ${payloadTypeName};`);
    }

    if (overrideProperties.length > 0) {
      lines.push(
        `export type ${schemaRecord.typeName} = Generated${schemaRecord.typeName} & { ${overrideProperties.join(' ')} };`,
      );
    } else {
      lines.push(
        `export type ${schemaRecord.typeName} = Generated${schemaRecord.typeName};`,
      );
    }

    lines.push('');
  }

  lines.push('export interface SchemaMap {');
  for (const schemaRecord of eventSchemaRecords) {
    lines.push(`  ${JSON.stringify(schemaRecord.schemaId)}: ${schemaRecord.typeName};`);
  }
  lines.push('}');
  lines.push('');

  return `${lines.join('\n')}`;
}

function createSchemaRegistrySource(schemaRecords) {
  const importLines = schemaRecords.map(
    (schemaRecord) =>
      `import ${schemaRecord.importName} from "./${schemaRecord.fileName}";`,
  );
  const schemaList = schemaRecords
    .map((schemaRecord) => `  ${schemaRecord.importName} as object,`)
    .join('\n');

  return `${BANNER_COMMENT}\n\n${importLines.join('\n')}\n\nexport const schemas = [\n${schemaList}\n] as const;\n`;
}

async function generateTypes(options = {}) {
  const outputDirectory = options.outputDirectory ?? DEFAULT_OUTPUT_DIRECTORY;
  const schemaDirectory = options.schemaDirectory ?? DEFAULT_SCHEMA_DIRECTORY;
  const publicTypesPath = options.publicTypesPath ?? DEFAULT_PUBLIC_TYPES_PATH;
  const schemaRegistryPath =
    options.schemaRegistryPath ?? DEFAULT_SCHEMA_REGISTRY_PATH;
  const schemaRecords = await loadSchemaRecords(schemaDirectory);
  const temporaryDirectory = await createTemporarySchemaDirectory(schemaRecords);

  await compileCoreTypes(temporaryDirectory, outputDirectory);

  await Promise.all(
    schemaRecords
      .filter((schemaRecord) => schemaRecord.fileName !== 'core.schema.json')
      .map((schemaRecord) =>
        compileEventTypes(temporaryDirectory, outputDirectory, schemaRecord),
      ),
  );

  await writeGeneratedFile(
    publicTypesPath,
    createPublicTypesSource(schemaRecords, outputDirectory),
  );
  await writeGeneratedFile(
    schemaRegistryPath,
    createSchemaRegistrySource(schemaRecords),
  );

  return {
    outputDirectory,
    publicTypesPath,
    schemaRegistryPath,
  };
}

module.exports = { generateTypes };

if (require.main === module) {
  generateTypes(parseArguments(process.argv.slice(2))).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

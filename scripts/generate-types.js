const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { compileFromFile } = require('json-schema-to-typescript');

const REPOSITORY_ROOT = path.resolve(__dirname, '..');
const SCHEMA_DIRECTORY = path.join(REPOSITORY_ROOT, 'src', 'schemas');
const DEFAULT_OUTPUT_DIRECTORY = path.join(
  REPOSITORY_ROOT,
  'src',
  'types',
  'generated',
);

const SCHEMA_FILES = [
  'core.schema.json',
  'create-event.schema.json',
  'delete-event.schema.json',
];

const SCHEMA_ID_TO_FILE = new Map([
  ['https://example.com/schemas/core', 'core.schema.json'],
  ['https://example.com/schemas/create-event', 'create-event.schema.json'],
  ['https://example.com/schemas/delete-event', 'delete-event.schema.json'],
]);

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

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--output-dir') {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error('Missing value for --output-dir');
      }
      outputDirectory = path.resolve(nextValue);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return { outputDirectory };
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
      [
        ...normalized.allOf,
        Object.fromEntries(structuralEntries),
      ],
    ],
  ]);
}

function localizeSchemaReferences(schema, currentFileName) {
  if (Array.isArray(schema)) {
    return schema.map((item) => localizeSchemaReferences(item, currentFileName));
  }

  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const localized = {};

  for (const [key, value] of Object.entries(schema)) {
    if (key === '$id' && typeof value === 'string') {
      localized[key] = SCHEMA_ID_TO_FILE.get(value) ?? value;
      continue;
    }

    if (key === '$ref' && typeof value === 'string') {
      let rewrittenReference = value;

      for (const [schemaId, fileName] of SCHEMA_ID_TO_FILE.entries()) {
        if (!value.startsWith(schemaId)) {
          continue;
        }

        const fragment = value.slice(schemaId.length);
        const suffix = fragment.length > 0 ? fragment : '';

        rewrittenReference =
          fileName === currentFileName
            ? suffix || '#'
            : `./${fileName}${suffix}`;
        break;
      }

      localized[key] = rewrittenReference;
      continue;
    }

    localized[key] = localizeSchemaReferences(value, currentFileName);
  }

  return localized;
}

async function createTemporarySchemaDirectory() {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'json-schema-types-'),
  );

  await Promise.all(
    SCHEMA_FILES.map(async (schemaFileName) => {
      const schemaPath = path.join(SCHEMA_DIRECTORY, schemaFileName);
      const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
      const preparedSchema = localizeSchemaReferences(
        normalizeAllOf(schema),
        schemaFileName,
      );

      await fs.writeFile(
        path.join(temporaryDirectory, schemaFileName),
        `${JSON.stringify(preparedSchema, null, 2)}\n`,
      );
    }),
  );

  return temporaryDirectory;
}

async function writeGeneratedFile(outputDirectory, fileName, contents) {
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(path.join(outputDirectory, fileName), contents);
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

  await writeGeneratedFile(outputDirectory, 'core.ts', coreTypes);
}

async function compileEventTypes(
  temporaryDirectory,
  outputDirectory,
  schemaFileName,
  typeName,
) {
  const generatedTypes = await compileFromFile(
    path.join(temporaryDirectory, schemaFileName),
    {
      bannerComment: BANNER_COMMENT,
      cwd: temporaryDirectory,
      declareExternallyReferenced: false,
      customName: (schema, fallbackName) =>
        schema.$id === schemaFileName ? typeName : fallbackName,
    },
  );

  const output = `import type {EventPayload, GitHubEvent} from "./core";\n\n${generatedTypes.trim()}\n\nexport type ${typeName}Payload = ${typeName}["payload"];\n`;

  await writeGeneratedFile(
    outputDirectory,
    `${schemaFileName.replace('.schema.json', '.ts')}`,
    output,
  );
}

async function generateTypes(options = {}) {
  const outputDirectory = options.outputDirectory ?? DEFAULT_OUTPUT_DIRECTORY;
  const temporaryDirectory = await createTemporarySchemaDirectory();

  await compileCoreTypes(temporaryDirectory, outputDirectory);
  await compileEventTypes(
    temporaryDirectory,
    outputDirectory,
    'create-event.schema.json',
    'CreateEvent',
  );
  await compileEventTypes(
    temporaryDirectory,
    outputDirectory,
    'delete-event.schema.json',
    'DeleteEvent',
  );

  return outputDirectory;
}

module.exports = { generateTypes };

if (require.main === module) {
  generateTypes(parseArguments(process.argv.slice(2))).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

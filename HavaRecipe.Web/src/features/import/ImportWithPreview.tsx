import { useMemo, useState } from 'react'
import {
  Alert,
  Anchor,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { importRecipe } from '../../api/recipes'
import type { ImportRecipeResponse } from '../../api/types'
import { normalizeRecipeJsonLd } from '../../api/schemaOrg'
import { JsonView } from '../../components/JsonView'
import { RecipePreview } from './RecipePreview'

const EXAMPLE_URL = 'https://www.allrecipes.com/recipe/16354/easy-meatloaf/'

export function ImportWithPreview() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<ImportRecipeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const normalized = useMemo(
    () => (result ? normalizeRecipeJsonLd(result.recipeJsonLd, result.suggestedName) : null),
    [result],
  )

  async function handleImport() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await importRecipe(url.trim()))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <Stack>
        <Title order={2}>Import with Preview</Title>

        <Group align="flex-end">
          <TextInput
            style={{ flex: 1 }}
            label="Recipe URL"
            placeholder={EXAMPLE_URL}
            value={url}
            onChange={(e) => setUrl(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && url.trim() && !loading) handleImport()
            }}
          />
          <Button onClick={handleImport} loading={loading} disabled={!url.trim()}>
            Import
          </Button>
        </Group>

        {error && (
          <Alert color="red" title="Import failed">
            {error}
          </Alert>
        )}

        {!result && !error && (
          <Card withBorder radius="md" padding="lg">
            <Stack gap="xs">
              <Text fw={500}>Paste a recipe URL and click Import.</Text>
              <Text c="dimmed" size="sm">
                The page is fetched server-side, its schema.org Recipe structured data is extracted, and
                a preview of what would be imported is shown below — nothing is saved. Pages behind a
                login can't be imported from the web app (that's coming to the mobile app).
              </Text>
              <Text size="sm">
                Try an example:{' '}
                <Anchor
                  component="button"
                  type="button"
                  onClick={() => setUrl(EXAMPLE_URL)}
                >
                  Easy Meatloaf
                </Anchor>
              </Text>
            </Stack>
          </Card>
        )}

        {result && normalized && (
          <Tabs defaultValue="preview">
            <Tabs.List>
              <Tabs.Tab value="preview">Preview</Tabs.Tab>
              <Tabs.Tab value="raw">Raw JSON</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="preview" pt="md">
              <RecipePreview recipe={normalized} />
            </Tabs.Panel>
            <Tabs.Panel value="raw" pt="md">
              <JsonView data={result} />
            </Tabs.Panel>
          </Tabs>
        )}
      </Stack>
    </Container>
  )
}

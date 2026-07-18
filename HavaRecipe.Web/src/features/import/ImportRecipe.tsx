import { useState } from 'react'
import { Alert, Button, Container, Group, Stack, Text, TextInput, Title } from '@mantine/core'
import { importRecipe } from '../../api/recipes'
import type { ImportRecipeResponse } from '../../api/types'
import { JsonView } from '../../components/JsonView'

export function ImportRecipe() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<ImportRecipeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
        <Title order={2}>Import a recipe from a URL</Title>
        <Text c="dimmed" size="sm">
          Fetches the page, extracts its schema.org Recipe JSON-LD, and shows the raw result. Nothing
          is saved — this previews what a POST to /recipes would receive.
        </Text>

        <Group align="flex-end">
          <TextInput
            style={{ flex: 1 }}
            label="Recipe URL"
            placeholder="https://www.allrecipes.com/recipe/16354/easy-meatloaf/"
            value={url}
            onChange={(e) => setUrl(e.currentTarget.value)}
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

        {result && <JsonView data={result} />}
      </Stack>
    </Container>
  )
}

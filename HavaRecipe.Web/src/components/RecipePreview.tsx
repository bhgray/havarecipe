import { Badge, Card, Divider, Group, Image, List, Stack, Text, Title } from '@mantine/core'
import type { RecipeView } from '../api/types'

// The API returns durations as minutes so clients can present them however they like.
function formatMinutes(total?: number): string | undefined {
  if (!total || total <= 0) return undefined
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return [hours > 0 ? `${hours} hr` : null, minutes > 0 ? `${minutes} min` : null]
    .filter(Boolean)
    .join(' ')
}

export function RecipePreview({ recipe }: { recipe: RecipeView }) {
  const badges: { label: string; value: string }[] = []
  const prep = formatMinutes(recipe.prepMinutes)
  const cook = formatMinutes(recipe.cookMinutes)
  const total = formatMinutes(recipe.totalMinutes)
  if (prep) badges.push({ label: 'Prep', value: prep })
  if (cook) badges.push({ label: 'Cook', value: cook })
  if (total) badges.push({ label: 'Total', value: total })
  if (recipe.recipeYield) badges.push({ label: 'Yield', value: recipe.recipeYield })

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack>
        {recipe.imageUrl && (
          <Image src={recipe.imageUrl} alt={recipe.name ?? 'Recipe image'} radius="md" mah={320} fit="cover" />
        )}

        <Title order={2}>{recipe.name ?? 'Untitled recipe'}</Title>

        {recipe.description && (
          <Text c="dimmed" size="sm">
            {recipe.description}
          </Text>
        )}

        {badges.length > 0 && (
          <Group gap="xs">
            {badges.map((b) => (
              <Badge key={b.label} variant="light" size="lg">
                {b.label}: {b.value}
              </Badge>
            ))}
          </Group>
        )}

        {recipe.ingredients.length > 0 && (
          <>
            <Divider label="Ingredients" labelPosition="left" />
            <List spacing="xs">
              {recipe.ingredients.map((item, i) => (
                <List.Item key={i}>{item}</List.Item>
              ))}
            </List>
          </>
        )}

        {recipe.steps.length > 0 && (
          <>
            <Divider label="Instructions" labelPosition="left" />
            <List type="ordered" spacing="sm">
              {recipe.steps.map((step, i) => (
                <List.Item key={i}>{step}</List.Item>
              ))}
            </List>
          </>
        )}

        {recipe.ingredients.length === 0 && recipe.steps.length === 0 && (
          <Text c="dimmed" size="sm">
            No ingredients or instructions were found in this page's structured data.
          </Text>
        )}
      </Stack>
    </Card>
  )
}

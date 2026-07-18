import { Badge, Card, Divider, Group, Image, List, Stack, Text, Title } from '@mantine/core'
import type { NormalizedRecipe } from '../api/schemaOrg'

export function RecipePreview({ recipe }: { recipe: NormalizedRecipe }) {
  const badges: { label: string; value: string }[] = []
  if (recipe.prepTime) badges.push({ label: 'Prep', value: recipe.prepTime })
  if (recipe.cookTime) badges.push({ label: 'Cook', value: recipe.cookTime })
  if (recipe.totalTime) badges.push({ label: 'Total', value: recipe.totalTime })
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

        {recipe.instructions.length > 0 && (
          <>
            <Divider label="Instructions" labelPosition="left" />
            <List type="ordered" spacing="sm">
              {recipe.instructions.map((step, i) => (
                <List.Item key={i}>{step}</List.Item>
              ))}
            </List>
          </>
        )}

        {recipe.ingredients.length === 0 && recipe.instructions.length === 0 && (
          <Text c="dimmed" size="sm">
            No ingredients or instructions were found in this page's structured data.
          </Text>
        )}
      </Stack>
    </Card>
  )
}

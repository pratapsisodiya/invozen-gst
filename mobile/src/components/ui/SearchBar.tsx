import { Searchbar, SearchbarProps } from 'react-native-paper'
import { StyleSheet } from 'react-native'

export function SearchBar(props: SearchbarProps) {
  return (
    <Searchbar
      placeholder="Search..."
      style={styles.searchBar}
      iconColor="#6B7280"
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  searchBar: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
})

import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Flame, LogIn, LogOut, PlusCircle, ShieldCheck, UserPlus } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth-context';
import { Button, Card, Pill, ScreenTitle } from '../components';
import { colors, fonts } from '../theme';

const bunny = require('../../assets/bunny_reading.png');

interface AccountScreenProps {
  navigation: any;
}

export function AccountScreen({ navigation }: AccountScreenProps) {
  const { user, signOut } = useAuth();
  const qc = useQueryClient();

  const logout = async () => {
    await signOut();
    qc.clear();
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <ScreenTitle
        title="More"
        subtitle="Your profile, contribution tools, and account settings."
      />
      {user ? (
        <>
          <Card style={styles.profile}>
            <Image source={bunny} style={styles.avatar} />
            <View style={styles.flexOne}>
              <Text style={styles.name}>{user.displayName || user.username}</Text>
              <Text style={styles.email}>{user.email}</Text>
              <Pill
                color={user.role === 'admin' ? colors.pinkDark : colors.green}
                background={user.role === 'admin' ? colors.pinkSoft : '#ECFDF5'}
              >
                {user.role === 'admin'
                  ? '👑 Admin'
                  : user.role === 'contributor'
                  ? '⭐ Contributor'
                  : '🌱 Student'}
              </Pill>
            </View>
          </Card>
          
          <Menu
            icon={<PlusCircle color={colors.amber} />}
            title="Contributions"
            text="Share vocabulary and readings"
            onPress={() => navigation.navigate('Contribution')}
          />
          <Menu
            icon={<Flame color={colors.amber} />}
            title="Learning streak"
            text="Keep your daily rhythm alive"
          />
          <Menu
            icon={<ShieldCheck color={colors.blue} />}
            title="Account & privacy"
            text="Your learning data is yours"
          />
          
          <Button
            title="Log Out"
            variant="danger"
            icon={<LogOut size={17} color={colors.danger} />}
            onPress={logout}
          />
        </>
      ) : (
        <Card style={styles.guest}>
          <Image source={bunny} style={styles.guestBunny} />
          <Text style={styles.guestTitle}>Your learning home awaits</Text>
          <Text style={styles.authSub}>
            Log in to save words, build decks, track streaks, and contribute.
          </Text>
          <Button
            title="Log In"
            variant="blue"
            icon={<LogIn size={17} color={colors.white} />}
            onPress={() => navigation.navigate('Login')}
          />
          <Button
            title="Create Account"
            variant="white"
            icon={<UserPlus size={17} color={colors.secondary} />}
            onPress={() => navigation.navigate('Register')}
          />
        </Card>
      )}
    </ScrollView>
  );
}

interface MenuProps {
  icon: React.ReactNode;
  title: string;
  text: string;
  onPress?: () => void;
}

function Menu({ icon, title, text, onPress }: MenuProps) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.menu}>
        {icon}
        <View style={styles.flexOne}>
          <Text style={styles.menuTitle}>{title}</Text>
          <Text style={styles.menuText}>{text}</Text>
        </View>
        <ChevronRight size={19} color={colors.muted} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 18,
    paddingBottom: 110,
    gap: 13,
  },
  flexOne: {
    flex: 1,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.pinkSoft,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.ink,
  },
  email: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.secondary,
    marginVertical: 4,
  },
  menu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 17,
  },
  menuTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
  },
  menuText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.secondary,
    marginTop: 2,
  },
  guest: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
  },
  guestBunny: {
    width: 130,
    height: 130,
    resizeMode: 'contain',
  },
  guestTitle: {
    fontFamily: fonts.bold,
    fontSize: 21,
    color: colors.ink,
  },
  authSub: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.secondary,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 7,
  },
});
